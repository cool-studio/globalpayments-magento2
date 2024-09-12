/*browser:true*/
/*global define*/
define(
    [
        'require',
        'jquery',
        'https://js.globalpay.com/v1/globalpayments.js',
        'GlobalPayments_PaymentGateway/js/view/payment/method-renderer/globalpayments-3ds',
        'GlobalPayments_PaymentGateway/js/common/helper',
        'GlobalPayments_PaymentGateway/js/view/payment/payment-method-code',
        'Magento_Checkout/js/view/payment/default',
        'Magento_Vault/js/view/payment/vault-enabler',
        'mage/translate',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/checkout-data',
        'Magento_Checkout/js/model/error-processor',
    ],
    function (
        require,
        $,
        GlobalPayments,
        GlobalPayments3DS,
        helper,
        paymentMethodCode,
        Component,
        VaultEnabler,
        $t,
        fullScreenLoader,
        Quote,
        checkoutData,
        errorProcessor
    ) {
        'use strict';

        return Component.extend({
            defaults: {
                template: 'GlobalPayments_PaymentGateway/payment/form',
                tokenResponse: null,
                serverTransId: null,
                giftcard_number: null,
                giftcard_pin: null,
                displayPaymentMethod: true,
            },

            initialize: function() {
                var self = this;

                self._super();
                this.vaultEnabler = new VaultEnabler();
                this.vaultEnabler.setPaymentCode(this.getVaultCode());
                // Uncheck the 'Save for later use' checkbox by default
                this.vaultEnabler.isActivePaymentTokenEnabler(false);

                return self;
            },

            initObservable: function() {
                this._super()
                    .observe(['displayPaymentMethod']);

                return this;
            },

            /**
             * Gets the current payment method's internal code
             *
             * This is usually a static string, but we're using `this.item.method`
             * to let Magento control this, making our lives easier when using this
             * method renderer for all our supported gateways.
             *
             * @returns {string}
             */
            getCode: function() {
                return this.item.method;
            },

            /**
             * Gets the payment method data
             *
             * This is called at least once before the payment data is submitted, so
             * care must be taken if the below data isn't yet available.
             *
             * @returns {object}
             */
            getData: function() {
                var data = {
                    'method': this.item.method,
                    'additional_data': {
                        tokenResponse: this.tokenResponse,
                        serverTransId: this.serverTransId,
                        giftcardNumber : $('#'+this.item.method + '_giftcard_number').val(),
                        giftcardPin: $('#'+this.item.method + '_giftcard_pin').val()
                    }
                };
                data['additional_data'] = _.extend(data['additional_data'], this.additionalData);
                if (this.isVaultEnabled()) {
                    this.vaultEnabler.visitAdditionalData(data);
                 }

                return data;
            },

            /**
             * Renders the payment fields using GlobalPayments.js. Each field is securely hosted on
             * Global Payments' production servers.
             *
             * @returns
             */
            renderPaymentFields: function () {
                if (!GlobalPayments) {
                    console.log('Warning! Payment fields cannot be loaded for ' + this.getCode());
                    return;
                }
                var paymentMethodConfig = this.getPaymentMethodConfiguration();
                if (paymentMethodConfig.error) {
                    if (paymentMethodConfig.hide) {
                        console.error(paymentMethodConfig.error);
                        this.displayPaymentMethod(false);
                        return;
                    }

                    this.showPaymentError(paymentMethodConfig.error);
                }

                GlobalPayments.configure(paymentMethodConfig);

                this.cardForm = GlobalPayments.ui.form({
                    fields: this.getFieldConfiguration(),
                    styles: this.getStyleConfiguration()
                });
                this.cardForm.on('submit', 'click', this.blockOnSubmit.bind(this));
                this.cardForm.on('token-success', this.handleResponse.bind(this));
                this.cardForm.on('token-error', this.handleErrors.bind(this));
                this.cardForm.on('error', this.handleErrors.bind(this));
                GlobalPayments.on('error', this.handleErrors.bind(this));
            },

            /**
             * Gets the payment method configuration
             *
             * Magento uses `GlobalPayments\PaymentGateway\Model\Ui\ConfigProvider` to provide
             * configuration from the PHP side.
             *
             * @returns {object}
             */
            getPaymentMethodConfiguration: function () {
                if (!window.checkoutConfig || !window.checkoutConfig.payment) {
                    return {};
                }

                return window.checkoutConfig.payment.globalpayments_paymentgateway || {};
            },

            /**
             * Handles the tokenization response
             *
             * On valid payment fields, the tokenization response is added to the current
             * state, and the order is placed.
             *
             * @param {object} response tokenization response
             * @returns
             */
            handleResponse: function (response) {
                helper.handleResponse(this, response, this.isThreeDSecureEnabled());
            },

            /**
             * 3DS Process
             */
            threeDSSecure: function () {
                if (!GlobalPayments || !window.GlobalPayments.ThreeDSecure) {
                    console.log('Warning! GlobalPayments JS helper libraries cannot be loaded for ' + this.getCode());
                    return;
                }

                var GlobalPayments3DS = window.GlobalPayments.ThreeDSecure;
                var self = this;

                GlobalPayments3DS.checkVersion(window.checkoutConfig.threeDSecure.globalpayments_paymentgateway.checkEnrollmentUrl, {
                    tokenResponse: this.tokenResponse,
                    amount: Quote.totals()['base_grand_total'],
                    currency: Quote.totals()['base_currency_code'],
                })
                    .then( function( versionCheckData ) {
                        if (versionCheckData.error) {
                            self.showPaymentError(versionCheckData.message);
                            return false;
                        }
                        if ("NOT_ENROLLED" === versionCheckData.status && "YES" !== versionCheckData.liabilityShift) {
                            self.showPaymentError('Please try again with another card.');
                            return false;
                        }
                        if ("NOT_ENROLLED" === versionCheckData.status && "YES" === versionCheckData.liabilityShift) {
                            self._placeOrder();
                            return true;
                        }

                        GlobalPayments3DS.initiateAuthentication(window.checkoutConfig.threeDSecure.globalpayments_paymentgateway.initiateAuthenticationUrl, {
                            tokenResponse: self.tokenResponse,
                            versionCheckData: versionCheckData,
                            challengeWindow: {
                                windowSize: GlobalPayments3DS.ChallengeWindowSize.Windowed500x600,
                                displayMode: 'lightbox',
                            },
                            order: {
                                amount: Quote.totals()['base_grand_total'],
                                currency: Quote.totals()['base_currency_code'],
                                billingAddress: Quote.billingAddress(),
                                shippingAddress: Quote.shippingAddress(),
                                customerEmail: checkoutData.getValidatedEmailValue(),
                            }
                        })
                            .then(function(authenticationData) {
                                if (authenticationData.error) {
                                    self.showPaymentError(authenticationData.message);
                                    return false;
                                }
                                self.serverTransId = authenticationData.serverTransactionId || authenticationData.challenge.response.data.threeDSServerTransID || versionCheckData.serverTransactionId;
                                self._placeOrder();
                                return true;
                            })
                            .catch(function(error) {
                                console.error(error);
                                self.showPaymentError('Something went wrong while doing 3DS processing.');
                                return false;
                            });
                    })
                    .catch(function(error) {
                        console.error(error);
                        self.showPaymentError('Something went wrong while doing 3DS processing.');
                        return false;
                    });

                $(document).on("click", 'img[id^="GlobalPayments-frame-close-"]', this.cancelTransaction.bind(this));

                return false;
            },

            /**
             * Assists with notifying the challenge status, when the user closes the challenge window
             */
            cancelTransaction: function () {
                window.parent.postMessage({ data: { "transStatus":"N" }, event: "challengeNotification" }, window.location.origin );
            },

            /**
             * Places/submits the order to Magento
             *
             * Attempts to click the default 'Place Order' button that is used by payment methods.
             * This is to account for other modules taking action based on that click event, even
             * though there are usually better options. If anything fails during that process,
             * we fall back to calling `this.placeOrder` manually.
             *
             * @returns
             */
            _placeOrder: function () {
                this.unblockOnError();
                try {
                    var originalSubmit = document.querySelector('.' + this.getCode() + ' button[type="submit"].checkout');
                    if (originalSubmit) {
                        originalSubmit.click();
                        return;
                    }
                } catch (e) { /* om nom nom */ }

                this.placeOrder();
            },

            /**
             * Validates the tokenization response
             *
             * @param {object} response tokenization response
             * @returns {boolean} status of validations
             */
            validateTokenResponse: function (response) {
                return helper.validateTokenResponse.bind(this, response)();
            },

            /**
             * Hides all validation error messages
             *
             * @returns
             */
            resetValidationErrors: function () {
                helper.resetValidationErrors.bind(this)();
            },

            /**
             * Shows the validation error for a specific payment field
             *
             * @param {string} fieldType Field type to show its validation error
             * @returns
             */
            showValidationError: function (fieldType) {
                helper.showValidationError.bind(this, fieldType)();
            },

            /**
             * Shows payment error
             *
             * @param {string} message Error message
             *
             * @returns
             */
            showPaymentError: function (message) {
                var response = {
                    responseText: JSON.stringify({
                        error: true,
                        message: message
                    })
                };
                errorProcessor.process(response, this.messageContainer);
                this.unblockOnError();
            },

            /**
             * Handles errors from the payment field iframes
             *
             * @todo handle more than card number errors
             * @param {object} error Details about the error
             * @returns
             */
            handleErrors: function (error) {
                helper.handleErrors(this, error);
            },

            /**
             * Gets payment field config
             *
             * @returns {string}
             */
            getFieldConfiguration: function () {
                return helper.getFieldConfiguration.bind(this, 'Place Order')();
            },

            /**
             * States whether the cardholder name input should be shown.
             *
             * @returns {Boolean}
             */
            showCardHolderName: function () {
                return this.getPaymentMethodConfiguration().showCardHolderName;
            },


            /**
             * States whether the 3D Secure authentication protocol should be processed.
             *
             * @returns {Boolean}
             */
            isThreeDSecureEnabled: function () {
                return this.getPaymentMethodConfiguration().enableThreeDSecure;
            },

            /**
             * Gets payment field styles
             *
             * @todo remove once these are available in prod version of globalpayments.js
             * @returns {string}
             */
            getStyleConfiguration: function () {
                var imageBase = window.checkoutConfig.payment.globalpayments_paymentgateway.imageBase;
                return helper.getStyleConfiguration.bind(this, imageBase)();
            },

            /**
             * @returns {Boolean}
             */
            isVaultEnabled: function () {
                return (window.checkoutConfig.payment.globalpayments_paymentgateway.allowCardSaving == 1) && this.vaultEnabler.isVaultEnabled();
            },

            /**
             * @returns {Boolean}
             */
            isSandboxMode: function () {
                return (window.checkoutConfig.payment.globalpayments_paymentgateway.sandboxMode == 1);
            },

            /**
             * Returns vault code.
             *
             * @returns {String}
             */
            getVaultCode: function () {
                return this.getCode() + '_vault';
            },

            isGiftCardEnabled: function () {
               return (window.checkoutConfig.payment.globalpayments_paymentgateway.giftEnabled == 1);
            },

            isPINEnabled: function () {
                return (window.checkoutConfig.payment.globalpayments_paymentgateway.giftPinEnabled == 1);
            },

            validate: function () {
                var form = '.form-cayancard';
                return $(form).validation() && $(form).validation('isValid');
            },

            applyGiftCard: function () {
                var _this = this;
                var screenLoader = fullScreenLoader;
                var giftcard_input = $('#'+this.getCode() + '_giftcard_number').val();
                var giftcard_input_pin = $('#'+this.getCode() + '_giftcard_pin').val();
                this.resetValidationErrors();

                if(giftcard_input === ''){
                	this.showValidationError('giftcard_number');
                	return false;
                } else if(this.isPINEnabled() && giftcard_input_pin == ''){
                	this.showValidationError('giftcard_pin');
                	return false;
                }
                screenLoader.startLoader();
                $.ajax({
                    url: window.checkoutConfig.payment.globalpayments_paymentgateway.giftcard_balance_url,
                    type: 'POST',
                    data: {
                    	giftcard_number : giftcard_input,
                        giftcard_pin: giftcard_input_pin
                    },
                    success: function(data) {
                      if (data.error) {
                        alert('Error adding gift card: ' + data.message);
                      } else {
                        //successful gift, show things
                        $('#' + _this.getCode() + '_giftcard_form .apply_giftcard').hide();
                        $('#' + _this.getCode() + '_giftcard_number').hide();
                        $('#' + _this.getCode() + '_giftcard_pin').hide();
                        $('#gift-card-number-label').text(giftcard_input + ' Available Balance - $' + data.balance);
                        $('#gift-card-number-label').show();
                        $('#' + _this.getCode() + '_giftcard_form .remove_giftcard').show();

                        if (!data.less_than_total) {
                          // skip cc capture enable
                          $('#' + _this.getCode() + '_new_credit_card_number').hide();
                          $('#' + _this.getCode() + '_credit_card_submit').hide();
                          $('#' + _this.getCode() + '_giftcard_form .checkout_giftcard').show();
                          this.tokenResponse = 'dummy';
                        }
                      }
                      screenLoader.stopLoader();
                    },
                  });
            },

            removeGiftCard: function () {
                $('#' + this.getCode() + '_giftcard_form .apply_giftcard').show();
                $('#' + this.getCode() + '_giftcard_number').val('').show();
                $('#' + this.getCode() + '_giftcard_pin').val('').show();
                $('#gift-card-number-label').text('').hide();
                $('#' + this.getCode() + '_giftcard_form .remove_giftcard').hide();

                // skip cc capture disable
                $('#' + this.getCode() + '_new_credit_card_number').show();
                $('#' + this.getCode() + '_credit_card_submit').show();
                $('#' + this.getCode() + '_giftcard_form .checkout_giftcard').hide();
                this.tokenResponse = '';
            },

            placeOrderGiftCard: function(){
                this._placeOrder();
            },

            /**
             * Blocks checkout UI
             *
             * @returns
             */
            blockOnSubmit: function () {
                var screenLoader = fullScreenLoader;
                screenLoader.startLoader();
            },

            /**
             * Unblocks checkout UI
             *
             * @returns
             */
            unblockOnError: function () {
                var screenLoader = fullScreenLoader;
                screenLoader.stopLoader();
            }
        });
    }
);
