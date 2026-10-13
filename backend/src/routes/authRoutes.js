
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.',
            });
        }

        const [members] = await pool.query(
            `SELECT id, full_name, email, password_hash, role, account_status
       FROM members
       WHERE email = ?
       LIMIT 1`,
            [email.trim()]
        );

        if (members.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        const member = members[0];

        const passwordMatches = await bcrypt.compare(
            password,
            member.password_hash
        );

        if (!passwordMatches || member.account_status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password, or account is inactive.',
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured.');

            return res.status(500).json({
                success: false,
                message: 'Authentication is not configured.',
            });
        }

        const token = jwt.sign(
            { sub: Number(member.id) },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                id: Number(member.id),
                fullName: member.full_name,
                email: member.email,
                role: member.role,
            },
        });
    } catch (error) {
        console.error('Login failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to complete login.',
        });
    }
});


router.get('/me', authenticate, async (req, res) => {
    try {
        const [members] = await pool.query(
            `SELECT id, full_name, email, role, account_status
             FROM members
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
        );

        if (
            members.length === 0 ||
            members[0].account_status !== 'active'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Account not found or inactive.',
            });
        }

        const member = members[0];

        return res.json({
            success: true,
            user: {
                id: Number(member.id),
                fullName: member.full_name,
                email: member.email,
                role: member.role,
            },
        });
    } catch (error) {
        console.error('Fetch current user failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch current user.',
        });
    }
});


export default router;
