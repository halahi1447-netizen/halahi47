const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
 
// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
 
const db = getFirestore();
 
exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
 
  try {
    const body = JSON.parse(event.body);
 
    // Salla sends order data when payment is complete
    const { event: sallaEvent, data } = body;
 
    // Only process completed orders
    if (sallaEvent !== 'order.completed' && sallaEvent !== 'order.payment_updated') {
      return { statusCode: 200, body: JSON.stringify({ message: 'Event ignored' }) };
    }
 
    const order = data;
    const customer = order.customer;
 
    if (!customer?.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No customer email' }) };
    }
 
    const email = customer.email.toLowerCase();
    const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
 
    // Determine plan from order items
    let plan = 'monthly';
    let months = 1;
 
    if (order.items && order.items.length > 0) {
      const itemName = order.items[0]?.product?.name?.toLowerCase() || '';
      if (itemName.includes('year') || itemName.includes('سنوي')) {
        plan = 'yearly'; months = 12;
      } else if (itemName.includes('quarter') || itemName.includes('ربع') || itemName.includes('3 month')) {
        plan = 'quarterly'; months = 3;
      }
    }
 
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
 
    // Save to Firestore
    const memberRef = db.collection('members').doc(email);
    const existing = await memberRef.get();
 
    if (existing.exists) {
      // Extend existing membership
      await memberRef.update({
        status: 'active',
        plan,
        expiresAt: expiresAt.toISOString(),
        lastOrderId: order.id,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // New member
      await memberRef.set({
        name,
        email,
        plan,
        source: 'salla',
        status: 'active',
        joinedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastOrderId: order.id,
        xp: 0,
        streak: 0,
        sessionsAttended: 0,
        cardsReviewed: 0,
      });
    }
 
    console.log(`Member saved: ${email}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, email, plan }),
    };
 
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
