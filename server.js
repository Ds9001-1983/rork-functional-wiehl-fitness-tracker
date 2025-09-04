// Load environment variables
require('dotenv').config();

require('ts-node/register');
const { serve } = require('@hono/node-server');
const app = require('./backend/hono.ts').default;

const port = process.env.PORT || 3000;

console.log(`🚀 Server starting on port ${port}`);
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

serve({
  fetch: app.fetch,
  port: port,
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`);
  console.log(`🌐 API available at http://localhost:${info.port}/api`);
  console.log(`🔧 tRPC endpoint: http://localhost:${info.port}/api/trpc`);
});