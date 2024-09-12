<a href="https://github.com/globalpayments" target="_blank">
    <img src="https://avatars.githubusercontent.com/u/25797248?s=200&v=4" alt="Global Payments logo" title="Global Payments" align="right" width="225" />
</a>

# Changelog

## Latest Version - v2.1.6 (08/02/24)
- Hotfix for the v2.1.5 version

## v2.1.5 (07/25/24)
### Enhancements:
- updated psr/log version to 2||3
- updated the Google Pay mark
- updated default payment selection functionality

## v2.1.4 (03/12/24)
### Enhancements:
- Fix admin-panel refund handling for multi-store installations

## v2.1.3 (02/12/24)
### Enhancements:
- Merged Sepa and Faster Payments into Bank Payment
- Added sort order for the payment methods

## v2.1.2 (01/30/24)
### Enhancements:
- Unified Payments - added PayPal
- Heartland - added Google Pay and Apple Pay compatible with the Heartland Payments Gateway

## v2.1.1 (01/11/24)
### Enhancements:
- GPI Transaction - Added GPI Transaction gateway support

## v2.1.0 (11/07/23)
### Enhancements:
- Google Pay / Apple Pay - added the possibility to partial refund an order
- Unified Payments - added Open Banking (Sepa and Faster Payments)

## v2.0.6 (09/10/23)
### Bug Fixes:
- Fixed a bug where the card type and last 4 cc would not be displayed on elsewhere.

## v2.0.5 (08/31/23)
### Enhancements:
- Unified Payments - added the option to enable/disable the 3DS process

### Bug Fixes:
- Fixed a bug where the payment token would not get decoded

## v2.0.4 (08/22/23)
### Enhancements:
- Supplemental to v2.0.3: duplicates v2.0.3 changes in cases where authorization-only trans type is used

## v2.0.3 (08/15/23)
### Enhancements:
- Supplemental to v2.0.2: save last 4 of CC to aforementioned tables when saved payment method is used

## v2.0.2 (08/03/23)
### Enhancements:
- Added functionality to save payment info to additional tables for easier access

## v2.0.1 (07/25/23)
### Enhancements:
- Added the Card Holder Name in the Google Pay and Apple Pay requests

### Bug Fixes:
- Fixed a bug where the cards would be stored for later use, even if the 'Save for later use' checkbox was unchecked

## v2.0.0 (07/13/23)
#### Enhancements:
- Magento 2.4.6 Compatibility
- Dropped PHP 7 and Magento 2.3 support

## v1.10.2 (06/22/23)
#### Enhancements:
- Unified Payments: Added Credential Check button

### Bug Fixes:
- Fixed a bug where the Card Number iframe would not be 100% expanded on Mozilla Firefox

---
