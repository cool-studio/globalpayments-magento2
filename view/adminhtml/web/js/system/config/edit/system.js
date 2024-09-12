require(
    [
        'jquery',
        'Magento_Ui/js/modal/alert',
        'mage/translate',
        'domReady!'
    ],
    function (
        $,
        alert,
        $t
    ) {
        'use strict';

        var context = null;

        function getGatewayId() {
            if (context && context.dataset && context.dataset.gatewayId) {
                return context.dataset.gatewayId;
            }

            return null;
        }

        function getEndpoint() {
            if (context && context.dataset && context.dataset.url) {
                return context.dataset.url;
            }

            return null;
        }

        function isSandboxMode() {
            return $('select[id$=' + getGatewayId() + '_sandbox_mode]').find(':selected').val();
        }

        function getCredentialSetting(setting) {
            if (Number(isSandboxMode()) === 1) {
                return $('input[id$=' + getGatewayId() + '_sandbox_' + setting + ']').val().trim();
            }

            return $('input[id$=' + getGatewayId() + '_' + setting + ']').val().trim();
        }

        window.globalPaymentsCredentialCheck = function() {
            context = this;

            if (!getGatewayId() || !getEndpoint()) {
                return;
            }

            var app_id = getCredentialSetting('app_id');
            var app_key = getCredentialSetting('app_key');

            var credentialsSuccess = $('.globalpayments-credentials-success');
            if (credentialsSuccess) {
                credentialsSuccess.remove();
            }

            var errors = [];

            if (!app_id) {
                errors.push($t('Please enter an App ID'));
            }

            if (!app_key) {
                errors.push($t('Please enter an App Key'));
            }

            if (errors.length > 0) {
                alert({
                    title: $t('Global Payments Credentials Check Failed'),
                    content:  errors.join('<br />')
                });

                return;
            }

            $(this).text($t('We\'re checking your credentials...')).attr('disabled', true);

            var self = this;
            $.ajax({
                type: 'POST',
                url: getEndpoint(),
                data: {
                    isSandboxMode: isSandboxMode(),
                    app_id: app_id,
                    app_key: app_key
                },
                showLoader: true,
                success: function (result) {
                    if (result.error) {
                        alert({
                            title: $t('Global Payments Credentials Check Failed'),
                            content: result.message
                        });
                    } else {
                        $('<div class=\'message message-success globalpayments-credentials-success\'>' + result.message + '</div>').insertAfter(self);
                    }
                }
            }).always(function () {
                $(self).text($t('Credentials Check')).attr('disabled', false);
            });
        }
    }
);
