<?php

namespace GlobalPayments\PaymentGateway\Test\Unit\Block;

use Magento\Framework\View\Element\Template\Context;
use Magento\Payment\Gateway\ConfigInterface;
use Magento\Payment\Model\InfoInterface;
use GlobalPayments\PaymentGateway\Block\Info;

class InfoTest extends \PHPUnit\Framework\TestCase
{
    /**
     * @var Context | \PHPUnit\Framework\MockObject\MockObject
     */
    protected $context;

    /**
     * @var ConfigInterface | \PHPUnit\Framework\MockObject\MockObject
     */
    protected $config;

    /**
     * @var InfoInterface | \PHPUnit\Framework\MockObject\MockObject
     */
    protected $paymentInfoModel;

    public function setUp()
    {
        $this->context = $this->getMockBuilder(Context::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->config = $this->createMock(ConfigInterface::class);
        $this->paymentInfoModel = $this->createMock(InfoInterface::class);
    }

    public function testGetSpecificationInformation()
    {
        $this->config->expects(static::once())
            ->method('getValue')
            ->willReturnMap(
                [
                    ['paymentInfoKeys', null, $this->getPaymentInfoKeys()]
                ]
            );
        $this->paymentInfoModel->expects(static::atLeastOnce())
            ->method('getAdditionalInformation')
            ->willReturnMap(
                $this->getAdditionalFields()
            );

        $info = new Info(
            $this->context,
            $this->config,
            [
                'is_secure_mode' => 0,
                'info' => $this->paymentInfoModel
            ]
        );

        static::assertSame($this->getExpectedResult(), $info->getSpecificInformation());
    }

    public function testGetSpecificationInformationSecure()
    {
        $this->config->expects(static::exactly(2))
            ->method('getValue')
            ->willReturnMap(
                [
                    ['paymentInfoKeys', null, $this->getPaymentInfoKeys()],
                    ['privateInfoKeys', null, $this->getPrivateInfoKeys()]
                ]
            );
        $this->paymentInfoModel->expects(static::atLeastOnce())
            ->method('getAdditionalInformation')
            ->willReturnMap(
                $this->getAdditionalFields()
            );

        $info = new Info(
            $this->context,
            $this->config,
            [
                'is_secure_mode' => 1,
                'info' => $this->paymentInfoModel
            ]
        );

        static::assertSame($this->getSecureExpectedResult(), $info->getSpecificInformation());
    }

    /**
     * @return array
     */
    private function getAdditionalFields()
    {
        return [
            ['FRAUD_MSG_LIST', ['Some issue happened', 'And some other happened too']],
            ['non_info_field', 'X'],
            ['PUBLIC_DATA', 'Payed with USD']
        ];
    }

    /**
     * @return string
     */
    private function getPaymentInfoKeys()
    {
        return 'FRAUD_MSG_LIST,PUBLIC_DATA';
    }

    /**
     * @return string
     */
    private function getPrivateInfoKeys()
    {
        return 'FRAUD_MSG_LIST';
    }

    /**
     * @return array
     */
    private function getExpectedResult()
    {
        return [
            (string)__('FRAUD_MSG_LIST') => 'Some issue happened; And some other happened too',
            (string)__('PUBLIC_DATA') => 'Payed with USD'
        ];
    }

    /**
     * @return array
     */
    private function getSecureExpectedResult()
    {
        return [
            (string)__('PUBLIC_DATA') => 'Payed with USD'
        ];
    }
}
