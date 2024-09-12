<?php

namespace GlobalPayments\PaymentGateway\Controller\ThreeDSecure;

use GlobalPayments\Api\Entities\Address;
use GlobalPayments\Api\Entities\BrowserData;
use GlobalPayments\Api\Entities\Enums\AddressType;
use GlobalPayments\Api\Entities\Enums\MethodUrlCompletion;
use GlobalPayments\Api\Entities\ThreeDSecure;
use GlobalPayments\Api\PaymentMethods\CreditCardData;
use GlobalPayments\Api\Services\Secure3dService;
use GlobalPayments\Api\Utils\CountryUtils;

class InitiateAuthentication extends AbstractAuthentications
{
    /**
     * @var array
     */
    private $_states = [ 'US', 'CA' ];

    /**
     * @inheritDoc
     */
    public function execute()
    {
        $response = [];
        $requestData = json_decode($this->getRequest()->getContent());

        try {
            $this->configHelper->setUpConfig();

            $paymentMethod = new CreditCardData();
            $paymentMethod->token = $this->getToken($requestData);

            $threeDSecureData = new ThreeDSecure();
            $threeDSecureData->serverTransactionId = $requestData->versionCheckData->serverTransactionId;
            $methodUrlCompletion = ($requestData->versionCheckData->methodData &&
                $requestData->versionCheckData->methodUrl) ? MethodUrlCompletion::YES : MethodUrlCompletion::NO;

            $shippingAddress = $this->mapAddress($requestData->order->shippingAddress);
            $billingAddress = $this->mapAddress($requestData->order->billingAddress);
            $addressMatchIndicator = $shippingAddress == $billingAddress;

            $threeDSecureData = Secure3dService::initiateAuthentication($paymentMethod, $threeDSecureData)
                ->withAmount($requestData->order->amount)
                ->withCurrency($requestData->order->currency)
                ->withOrderCreateDate(date('Y-m-d H:i:s'))
                ->withAddress($billingAddress, AddressType::BILLING)
                ->withAddress($shippingAddress, AddressType::SHIPPING)
                ->withAddressMatchIndicator($addressMatchIndicator)
                ->withCustomerEmail($requestData->order->customerEmail)
                ->withAuthenticationSource($requestData->authenticationSource)
                ->withAuthenticationRequestType($requestData->authenticationRequestType)
                ->withMessageCategory($requestData->messageCategory)
                ->withChallengeRequestIndicator($requestData->challengeRequestIndicator)
                ->withBrowserData($this->getBrowserData($requestData))
                ->withMethodUrlCompletion($methodUrlCompletion)
                ->execute();

            $response['liabilityShift'] = $threeDSecureData->liabilityShift;
            // frictionless flow
            if ($threeDSecureData->status !== 'CHALLENGE_REQUIRED') {
                $response['result'] = $threeDSecureData->status;
                $response['authenticationValue'] = $threeDSecureData->authenticationValue;
                $response['serverTransactionId'] = $threeDSecureData->serverTransactionId;
                $response['messageVersion'] = $threeDSecureData->messageVersion;
                $response['eci'] = $threeDSecureData->eci;

            } else { //challenge flow
                $response['status'] = $threeDSecureData->status;
                $response['challengeMandated'] = $threeDSecureData->challengeMandated;
                $response['challenge']['requestUrl'] = $threeDSecureData->issuerAcsUrl;
                $response['challenge']['encodedChallengeRequest'] = $threeDSecureData->payerAuthenticationRequest;
                $response['challenge']['messageType'] = $threeDSecureData->messageType;
            }

        } catch (\Exception $e) {
            $response = [
                'error' => true,
                'message' => $e->getMessage(),
            ];
            $this->logger->debug([$e->getMessage()]);
        }

        $this->sendResponse(json_encode($response));
    }

    /**
     * Get user's browser data.
     *
     * @param \stdClass $requestData
     * @return BrowserData
     */
    private function getBrowserData($requestData)
    {
        $browserData = new BrowserData();
        $browserData->acceptHeader = $this->getRequest()->getServer('HTTP_ACCEPT');
        $browserData->colorDepth = $requestData->browserData->colorDepth;
        $browserData->ipAddress = $this->getRequest()->getServer('REMOTE_ADDR');
        $browserData->javaEnabled = $requestData->browserData->javaEnabled ?? false;
        $browserData->javaScriptEnabled = $requestData->browserData->javascriptEnabled;
        $browserData->language = $requestData->browserData->language;
        $browserData->screenHeight = $requestData->browserData->screenHeight;
        $browserData->screenWidth = $requestData->browserData->screenWidth;
        $browserData->challengWindowSize = $requestData->challengeWindow->windowSize;
        $browserData->timeZone = $requestData->browserData->timezoneOffset;
        $browserData->userAgent = $requestData->browserData->userAgent;

        return $browserData;
    }

    /**
     * Map the address from Magento to the specific class from the SDK.
     *
     * @param \stdClass $orderAddress
     * @return Address
     */
    private function mapAddress($orderAddress)
    {
        $address = new Address();
        $address->city = isset($orderAddress->city) ? $orderAddress->city : '';
        $address->streetAddress1 = isset($orderAddress->street[0]) ? $orderAddress->street[0] : '';
        $address->streetAddress2 = isset($orderAddress->street[1]) ? $orderAddress->street[1] : '';
        $address->streetAddress3 = isset($orderAddress->street[2]) ? $orderAddress->street[2] : '';
        $address->postalCode = isset($orderAddress->postcode) ? $orderAddress->postcode : '';
        $address->country = isset($orderAddress->countryId) ? $orderAddress->countryId : '';
        if (in_array($address->country, $this->_states) && isset($orderAddress->regionCode)) {
            $address->state = $orderAddress->regionCode;
        }

        $address->countryCode = CountryUtils::getNumericCodeByCountry($address->country);

        return $address;
    }
}
