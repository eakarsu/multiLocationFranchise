const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate } = require('../middleware/auth');

const router = express.Router();

// =====================
// Announcements
// =====================

// Get all announcements
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const { isPublished, priority } = req.query;

    const where = {};
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (priority) where.priority = priority;

    // Filter by user role for published announcements
    if (where.isPublished) {
      where.OR = [
        { targetRoles: { isEmpty: true } },
        { targetRoles: { has: req.user.role } }
      ];
      where.expiresAt = { OR: [{ equals: null }, { gt: new Date() }] };
    }

    const announcements = await req.prisma.announcement.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }]
    });

    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to get announcements' });
  }
});

// Get announcement by ID
router.get('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    const announcement = await req.prisma.announcement.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to get announcement' });
  }
});

// Create announcement
router.post('/announcements', authenticateToken, isCorporate, [
  body('title').notEmpty().trim(),
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, priority, targetRoles, isPublished, expiresAt } = req.body;

    const announcement = await req.prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'MEDIUM',
        authorId: req.user.id,
        targetRoles: targetRoles || [],
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { title, content, priority, targetRoles, isPublished, expiresAt } = req.body;

    const existing = await req.prisma.announcement.findUnique({
      where: { id: req.params.id }
    });

    const updateData = {
      title,
      content,
      priority,
      targetRoles,
      isPublished,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    // Set publishedAt when first published
    if (isPublished && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const announcement = await req.prisma.announcement.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(announcement);
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.announcement.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// =====================
// Messages
// =====================

// Get messages (inbox)
router.get('/messages/inbox', authenticateToken, async (req, res) => {
  try {
    const { isRead } = req.query;

    const where = { receiverId: req.user.id };
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const messages = await req.prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

// Get sent messages
router.get('/messages/sent', authenticateToken, async (req, res) => {
  try {
    const messages = await req.prisma.message.findMany({
      where: { senderId: req.user.id },
      include: {
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({ error: 'Failed to get sent messages' });
  }
});

// Get message by ID
router.get('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const message = await req.prisma.message.findUnique({
      where: { id: req.params.id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is sender or receiver
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as read if receiver is viewing
    if (message.receiverId === req.user.id && !message.isRead) {
      await req.prisma.message.update({
        where: { id: req.params.id },
        data: { isRead: true, readAt: new Date() }
      });
      message.isRead = true;
      message.readAt = new Date();
    }

    res.json(message);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// Send message
router.post('/messages', authenticateToken, [
  body('receiverId').notEmpty(),
  body('subject').notEmpty().trim(),
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiverId, subject, content } = req.body;

    const message = await req.prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId,
        subject,
        content
      },
      include: {
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const message = await req.prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() }
    });

    res.json(message);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const message = await req.prisma.message.findUnique({
      where: { id: req.params.id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender or receiver can delete
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await req.prisma.message.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get unread message count
router.get('/messages/count/unread', authenticateToken, async (req, res) => {
  try {
    const count = await req.prisma.message.count({
      where: { receiverId: req.user.id, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// =====================
// Knowledge Base
// =====================

// Get all articles
router.get('/knowledge', authenticateToken, async (req, res) => {
  try {
    const { category, search, isPublished } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    const articles = await req.prisma.knowledgeArticle.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to get articles' });
  }
});

// Get article by ID
router.get('/knowledge/:id', authenticateToken, async (req, res) => {
  try {
    const article = await req.prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to get article' });
  }
});

// Create article
router.post('/knowledge', authenticateToken, [
  body('title').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, category, content, tags, isPublished } = req.body;

    // Verify user exists before creating article
    const userExists = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!userExists) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const article = await req.prisma.knowledgeArticle.create({
      data: {
        title,
        category,
        content,
        tags: tags || [],
        authorId: req.user.id,
        isPublished: isPublished !== undefined ? isPublished : true
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Create article error:', error);
    if (error.code === 'P2003') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update article
router.put('/knowledge/:id', authenticateToken, async (req, res) => {
  try {
    const { title, category, content, tags, isPublished } = req.body;

    const article = await req.prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: { title, category, content, tags, isPublished },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(article);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article
router.delete('/knowledge/:id', authenticateToken, async (req, res) => {
  try {
    await req.prisma.knowledgeArticle.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// =====================
// Support Tickets
// =====================

// Get all tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const { status, priority, category } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    // Non-corporate users can only see their own tickets
    if (!['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(req.user.role)) {
      where.submitterId = req.user.id;
    }

    const tickets = await req.prisma.supportTicket.findMany({
      where,
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    });

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Get ticket by ID
router.get('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await req.prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check access
    if (!['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(req.user.role) && ticket.submitterId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Create ticket
router.post('/tickets', authenticateToken, [
  body('subject').notEmpty().trim(),
  body('description').notEmpty(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, description, category, priority } = req.body;

    // Generate ticket number
    const ticketCount = await req.prisma.supportTicket.count();
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(6, '0')}`;

    const ticket = await req.prisma.supportTicket.create({
      data: {
        ticketNumber,
        submitterId: req.user.id,
        subject,
        description,
        category,
        priority: priority || 'MEDIUM'
      },
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
router.put('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { subject, description, category, priority, status, assignedTo, resolution } = req.body;

    const updateData = { subject, description, category, priority, status, assignedTo, resolution };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const ticket = await req.prisma.supportTicket.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(ticket);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Delete ticket
router.delete('/tickets/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.supportTicket.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// Get communication stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [unreadMessages, openTickets, publishedAnnouncements] = await Promise.all([
      req.prisma.message.count({
        where: { receiverId: req.user.id, isRead: false }
      }),
      req.prisma.supportTicket.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER'] },
          ...((!['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(req.user.role)) && { submitterId: req.user.id })
        }
      }),
      req.prisma.announcement.count({
        where: {
          isPublished: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      })
    ]);

    res.json({ unreadMessages, openTickets, publishedAnnouncements });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get knowledge categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.knowledgeArticle.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;
