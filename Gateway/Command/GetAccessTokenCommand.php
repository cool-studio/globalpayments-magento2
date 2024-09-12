<?php

namespace GlobalPayments\PaymentGateway\Gateway\Command;

use Exception;
use InvalidArgumentException;
use GlobalPayments\Api\Entities\Enums\Environment;
use GlobalPayments\Api\ServiceConfigs\Gateways\GpApiConfig;
use GlobalPayments\Api\ServicesContainer;
use GlobalPayments\Api\Utils\Logging\Logger;
use GlobalPayments\Api\Utils\Logging\SampleRequestLogger;
use GlobalPayments\PaymentGateway\Gateway\Config;
use Magento\Payment\Gateway\Command\Result\ArrayResult;
use Magento\Payment\Gateway\Command\Result\ArrayResultFactory;
use Magento\Payment\Gateway\Command\ResultInterface;
use Magento\Payment\Gateway\CommandInterface;

class GetAccessTokenCommand implements CommandInterface
{
    /**
     * @var ArrayResultFactory
     */
    private ArrayResultFactory $resultFactory;

    /**
     * @param ArrayResultFactory $resultFactory
     */
    public function __construct(
        ArrayResultFactory $resultFactory
    ) {
        $this->resultFactory = $resultFactory;
    }

    /**
     * @inheritDoc
     */
    public function execute(array $commandSubject): ArrayResult|ResultInterface|null
    {
        $gatewayConfig = $commandSubject['gatewayConfig'] ?? null;
        $configData = $commandSubject['configData'] ?? [];

        if (!$gatewayConfig || !$gatewayConfig instanceof Config) {
            throw new InvalidArgumentException('Gateway config data object should be provided');
        }

        $result = ['array' => []];

        $backendGatewayOptions = [
            'appId' => $gatewayConfig->getCredentialSetting('app_id'),
            'appKey' => $gatewayConfig->getCredentialSetting('app_key'),
            'environment' => ($gatewayConfig->getValue('sandbox_mode') == 1) ?
                Environment::TEST : Environment::PRODUCTION
        ];

        $backendGatewayOptions = array_merge($backendGatewayOptions, $configData);

        try {
            $config = new GpApiConfig();

            foreach ($backendGatewayOptions as $key => $value) {
                if (property_exists($config, $key)) {
                    $config->{$key} = $value;
                }
            }

            $config->permissions = ['PMT_POST_Create_Single'];
            $config->dynamicHeaders = [
                'x-gp-platform' => $gatewayConfig->getPlatformHeader(),
                'x-gp-extension' => $gatewayConfig->getExtensionHeader(),
            ];

            if (!empty($gatewayConfig->getValue('debug'))) {
                $config->requestLogger = new SampleRequestLogger(new Logger(
                    $gatewayConfig->getLoggingDir()
                ));
            }

            ServicesContainer::configureService($config);
            $accessToken = ServicesContainer::instance()->getClient('default')->getAccessToken()->token;

            $result['array'] = [
                'accessToken' => $accessToken
            ];
        } catch (Exception $e) {
            $result['array'] = [
                'error' => true,
                'message' => $e->getMessage()
            ];
        }

        return $this->resultFactory->create($result);
    }
}
