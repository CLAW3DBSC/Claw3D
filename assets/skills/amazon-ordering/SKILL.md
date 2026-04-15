---
name: amazon
description: Buy and return items on Amazon using browser automation. Use for purchasing, reordering, checking order history, and processing returns.
metadata: {"openclaw":{"skillKey":"amazon-ordering"}}
---

# Amazon Ordering

Use this skill when the user wants an agent to buy something on Amazon, reorder a previous item, inspect Amazon order history, or start a return.

## Trigger

```json
{
  "activation": {
    "anyPhrases": [
      "amazon",
      "buy on amazon",
      "order on amazon",
      "reorder on amazon",
      "amazon order history",
      "amazon return"
    ]
  },
  "movement": {
    "target": "shop",
    "skipIfAlreadyThere": true
  }
}
```

When this skill is activated, the agent should walk to the office shop before handling the request.

- Treat requests from Telegram or any other external surface as valid triggers when they ask for Amazon purchasing, reordering, order lookup, or return processing.
- The physical behavior for this skill is: go to the shop, connect to the browser session, then perform the Amazon workflow.
- If the agent is already at the shop, continue without adding extra movement narration.

## Prerequisites

- `agent-browser` CLI installed.
- Chrome running with remote debugging enabled on port `9222`.
- Logged into Amazon. If logged out, retrieve the password from the configured password manager or ask the user to complete login.
- If running headless on Linux, use VNC or another visual path so the user can solve CAPTCHAs or 2FA when needed.

## Setup

Read `skills/amazon-ordering/defaults.json` before making a purchase or processing a return. Use these saved workspace defaults:

```json
{
  "shippingAddress": "123 Main St, Springfield, IL 62704",
  "paymentMethod": "Visa ending in 4242",
  "returnDropoff": "Whole Foods"
}
```

If `defaults.json` is missing, fall back to these environment variables:

```bash
export AMAZON_SHIPPING_ADDRESS="Your shipping address"
export AMAZON_PAYMENT_METHOD="Your preferred card"
export AMAZON_RETURN_DROPOFF="Whole Foods"
```

Always verify the shipping address and payment method before placing an order.

## Communication rules

- Do not narrate each click or intermediate browser step.
- Only message the user when you need clarification, confirmation, or manual intervention.
- If Amazon shows CAPTCHA, MFA, login recovery, or an unexpected checkout change, pause and ask the user to help.
- When a purchase, reorder, or return is confirmed, reply with a brief summary of the result.

## Ordering rules

### Reorders

- Go directly to Amazon order history and search for the item.
- Use "Buy it again" when the correct previous item is found.
- Verify the selected address and payment method.
- Place the order once the item clearly matches the user's request.
- No screenshot is required for a confirmed reorder unless something looks ambiguous.

### New items

- Search or navigate to the requested product.
- Before adding to cart, send the user a screenshot that clearly shows the product image and price.
- Wait for explicit user confirmation before continuing with a new item purchase.
- Verify the address and payment method again on checkout before placing the order.

### Order history and status

- Use order history for lookup, reorder decisions, and return eligibility checks.
- When the user asks about past purchases, summarize only the relevant orders instead of dumping the full page.
- If multiple similar orders match, ask which one they mean before acting.

## Return defaults

Use these defaults unless the user says otherwise:

- Return reason: "Changed Mind" -> "My needs changed".
- Packaging opened: Yes.
- Item in original packaging: Yes.
- Have you used the item: Yes.
- Signs of use: None.
- Battery leaks or overheating: No.
- All accessories included: Yes.
- Refund type: Refund to original payment method.
- Drop-off location: Use `returnDropoff` from `defaults.json`, or `AMAZON_RETURN_DROPOFF`, or Whole Foods.

## Return flow

1. Open order history and find the item.
2. Choose "Return or replace items".
3. Select "Changed Mind" and then "My needs changed".
4. Answer condition questions with the defaults in this document unless the user gave different facts.
5. Continue past support suggestions.
6. Select refund to the original payment method.
7. Select the preferred drop-off location.
8. Confirm the return.

After a successful return, send only a short confirmation that includes the item name, refund amount, and drop-off location plus deadline if Amazon shows one.

## Browser workflow

### Connect to the browser

```bash
agent-browser connect 9222
```

Always open a new tab because other sessions may share the same Chrome profile. Use `--new-tab` on every open command.

### Search order history

```bash
agent-browser open --new-tab "https://www.amazon.com/gp/your-account/order-history"
agent-browser snapshot -i
```

Use the order-history search box to find the relevant item.

### Reorder flow

```bash
agent-browser click @[buy-it-again-ref]
agent-browser snapshot -i
```

Verify the address and payment method before clicking the place-order control.

### Screenshot guidance

- Scroll past Amazon navigation bars before taking the screenshot.
- Ensure the product image and current price are both visible.
- Save the screenshot to a temporary location and send it with a short caption.

## Starting the browser if needed

### Linux desktop session

```bash
google-chrome --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com &
```

### Linux headless session

```bash
DISPLAY=:99 google-chrome --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com &
```

### macOS

```bash
open -na "Google Chrome" --args --user-data-dir=$HOME/.config/chrome-agent --no-first-run --remote-debugging-port=9222 https://www.amazon.com
```

## Notes

- The browser profile typically persists login at `$HOME/.config/chrome-agent`.
- Workspace defaults live in `skills/amazon-ordering/defaults.json`.
- Order confirmations go to the email on the Amazon account.
- If the user asks for a new purchase but has not confirmed the item screenshot yet, do not place the order.
- If the user asks for a return, use the silent return workflow and only surface the final result unless clarification is required.
