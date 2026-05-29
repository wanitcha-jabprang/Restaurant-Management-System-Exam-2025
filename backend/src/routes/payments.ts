// src/routes/payments.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

// POST /api/payments
// 🛠️ FIXED [BUG-001]: Added robust input validation and fixed control flow returns
router.post('/', authenticate, requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const { orderId, amountPaid, method } = req.body as {
      orderId?: number; amountPaid?: number; method?: 'cash' | 'card' | 'qr'
    }

    // 1. ตรวจสอบว่าส่งข้อมูลที่จำเป็นมาครบถ้วนและถูกต้องหรือไม่
    if (!orderId || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({ error: 'orderId and amountPaid required' })
    }

    // 2. ป้องกันกรณีส่งค่าติดลบ หรือไม่ใช่ตัวเลขเข้ามา
    const paid = Number(amountPaid)
    if (isNaN(paid) || paid < 0) {
      return res.status(400).json({ error: 'amountPaid must be a valid positive number' })
    }

    // 3. ค้นหาข้อมูลออเดอร์
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) { 
      return res.status(404).json({ error: 'Order not found' }) 
    }
    if (order.status !== 'confirmed') {
      return res.status(400).json({ error: 'Order must be confirmed before payment' })
    }
    if (!order.items.length) {
      return res.status(400).json({ error: 'Order has no items' })
    }

    const totalAmount = Number(order.totalAmount)

    // 4. [จุดสำคัญ] ตรวจสอบว่าเงินที่จ่ายมา น้อยกว่ายอดรวมที่ต้องจ่ายหรือไม่
    if (paid < totalAmount) {
      return res.status(400).json({ 
        error: 'Insufficient payment amount', 
        required: totalAmount, 
        provided: paid 
      })
    }

    // 5. คำนวณเงินทอน (ค่าจะเป็นบวกหรือศูนย์เสมอ ไม่มีทางติดลบ)
    const change = paid - totalAmount

    // 6. บันทึกธุรกรรมลงฐานข้อมูลแบบพร้อม ๆ กัน (Transaction)
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { 
          orderId, 
          cashierId: req.user!.id, 
          totalAmount, 
          amountPaid: paid, 
          change, 
          method: method ?? 'cash' 
        },
      }),
      prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } }),
      prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'available' } }),
    ])

    return res.status(201).json({ payment, change, message: 'Payment processed successfully' })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/payments/:orderId
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { orderId: Number(req.params.orderId) },
    })
    if (!payment) { 
      return res.status(404).json({ error: 'Payment not found' }) 
    }
    return res.json(payment)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export default router