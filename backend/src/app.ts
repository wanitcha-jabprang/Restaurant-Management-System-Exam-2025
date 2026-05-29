// src/app.ts
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import prisma from './lib/prisma'

import authRoutes    from './routes/auth'
import menuRoutes    from './routes/menu'
import orderRoutes   from './routes/orders'
import paymentRoutes from './routes/payments'
import reportRoutes  from './routes/reports'

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['https://restaurant-management-s-git-26e209-wanitcha-jabprang-s-projects.vercel.app', 'http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'), false)
    }
  },
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth',     authRoutes)
app.use('/api/menu',     menuRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/reports',  reportRoutes)

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), version: '2.0.0' })
)

const PORT = Number(process.env.PORT) || 3001

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`RMS API v2 running on port ${PORT}`))
}

export default app
