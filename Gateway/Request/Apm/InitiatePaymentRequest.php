<?php

namespace GlobalPayments\PaymentGateway\Gateway\Request\Apm;

use GlobalPayments\PaymentGateway\Gateway\ConfigFactory;
use GlobalPayments\PaymentGateway\Helper\Utils;
use Magento\Payment\Gateway\Data\OrderAdapterInterface;
use Magento\Payment\Gateway\Helper\SubjectReader;
use Magento\Payment\Gateway\Request\BuilderInterface;
use Magento\Payment\Model\MethodInterface;

class InitiatePaymentRequest implements BuilderInterface
{
    /**
     * @var ConfigFactory
     */
    private $configFactory;

    /**
     * @var Utils
     */
    private $utils;

    /**
     * Initiate Payment Request constructor.
     *
     * @param ConfigFactory $configFactory
     * @param Utils $utils
     */
    public function __construct(
        ConfigFactory $configFactory,
        Utils $utils
    ) {
        $this->configFactory = $configFactory;
        $this->utils = $utils;
    }

    /**
     * @inheritDoc
     */
    public function build(array $buildSubject)
    {
        $payment = SubjectReader::readPayment($buildSubject);
        $paymentData = $payment->getPayment();
        $order = $payment->getOrder();
        $orderId = $order->getId();

        /** Get the config of the current Apm provider */
        $config = $this->configFactory->create($paymentData->getMethod());

        return [
            'TXN_TYPE' => $config->getPaymentAction() === MethodInterface::ACTION_AUTHORIZE ? 'authorize' : 'charge',
            'AMOUNT' => $order->getGrandTotalAmount(),
            'CONFIG' => $config,
            'CURRENCY' => $order->getCurrencyCode(),
            'CUSTOMER_DATA' => $this->getCustomerData($order),
            'DESCRIPTOR' => $this->getDescriptor($orderId),
            'ORDER_ID' => (string) $orderId,
            'PROVIDER_DATA' => $config->getProviderEndpoints(),
            'SERVICES_CONFIG' => $config->getBackendGatewayOptions(),
        ];
    }

    /**
     * Get customer data.
     *
     * @param OrderAdapterInterface $order
     * @return array
     */
    private function getCustomerData($order)
    {
        $billingAddress = $order->getBillingAddress();
        $accountHolderName = $this->utils->sanitizeString($billingAddress->getFirstname()) . ' ' .
            $this->utils->sanitizeString($billingAddress->getLastname());

        return [
            'accountHolderName' => $accountHolderName,
            'country' => $billingAddress->getCountryId(),
        ];
    }

    /**
     * Get the remittance reference information.
     *
     * @param int $orderId
     * @return string
     */
    private function getDescriptor($orderId)
    {
        return 'ORD' . $orderId;
    }
}
