export default async function handler(req, res) {
  // Allow CORS from your shop
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  if(req.method !== 'POST'){
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { variantId, price, properties, quantity } = req.body;

  const SHOP = process.env.SHOP_DOMAIN;       // yourstore.myshopify.com
  const TOKEN = process.env.ADMIN_API_TOKEN;  // Admin API token

  try {
    // Build line item properties array
    const lineProperties = Object.entries(properties || {})
      .map(([name, value]) => ({ name, value }));

    const draftOrderPayload = {
      draft_order: {
        line_items: [
          {
            variant_id: variantId,
            quantity: quantity || 1,
            applied_discount: null,
            properties: lineProperties,
            // This overrides the price ✓
            price: (price / 100).toFixed(2)
          }
        ],
        use_customer_default_address: true
      }
    };

    const response = await fetch(
      `https://${SHOP}/admin/api/2024-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': TOKEN
        },
        body: JSON.stringify(draftOrderPayload)
      }
    );

    const data = await response.json();

    if(data.errors){
      return res.status(400).json({ error: data.errors });
    }

    // Return the invoice URL — this is the checkout URL
    return res.status(200).json({
      invoice_url: data.draft_order.invoice_url,
      draft_order_id: data.draft_order.id
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
