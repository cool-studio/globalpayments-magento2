<?php

namespace GlobalPayments\PaymentGateway\Test\Unit\Gateway\Request;

use Magento\Payment\Gateway\ConfigInterface;
use Magento\Payment\Gateway\Data\OrderAdapterInterface;
use Magento\Payment\Gateway\Data\PaymentDataObjectInterface;
use Magento\Sales\Model\Order\Payment;
use GlobalPayments\PaymentGateway\Gateway\Request\VoidRequest;

class VoidRequestTest extends \PHPUnit\Framework\TestCase
{
    public function testBuild()
    {
        $merchantToken = 'secure_token';
        $txnId = 'fcd7f001e9274fdefb14bff91c799306';
        $storeId = 1;

        $expectation = [
            'TXN_TYPE' => 'V',
            'TXN_ID' => $txnId,
            'MERCHANT_KEY' => $merchantToken
        ];

        $configMock = $this->createMock(ConfigInterface::class);
        $orderMock = $this->createMock(OrderAdapterInterface::class);
        $paymentDO = $this->createMock(PaymentDataObjectInterface::class);
        $paymentModel = $this->getMockBuilder(Payment::class)
            ->disableOriginalConstructor()
            ->getMock();

        $paymentDO->expects(static::once())
            ->method('getOrder')
            ->willReturn($orderMock);
        $paymentDO->expects(static::once())
            ->method('getPayment')
            ->willReturn($paymentModel);

        $paymentModel->expects(static::once())
            ->method('getLastTransId')
            ->willReturn($txnId);

        $orderMock->expects(static::any())
            ->method('getStoreId')
            ->willReturn($storeId);

        $configMock->expects(static::once())
            ->method('getValue')
            ->with('merchant_gateway_key', $storeId)
            ->willReturn($merchantToken);

        /** @var ConfigInterface $configMock */
        $request = new VoidRequest($configMock);

        static::assertEquals(
            $expectation,
            $request->build(['payment' => $paymentDO])
        );
    }
}
