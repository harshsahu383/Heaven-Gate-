
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        const token = authorization.slice(7);
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error('JWT_SECRET is not configured.');

            return res.status(500).json({
                success: false,
                message: 'Authentication is not configured.',
            });
        }

        const decoded = jwt.verify(token, secret);

        if (
            !decoded ||
            !Number.isSafeInteger(decoded.sub) ||
            decoded.sub <= 0
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token.',
            });
        }

        const [members] = await pool.query(
            `SELECT id, role, account_status
       FROM members
       WHERE id = ?
       LIMIT 1`,
            [decoded.sub]
        );

        if (
            members.length === 0 ||
            members[0].account_status !== 'active'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Account is unavailable.',
            });
        }

        req.user = {
            id: Number(members[0].id),
            role: members[0].role,
            accountStatus: members[0].account_status,
        };

        next();
    } catch (error) {
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired authentication token.',
            });
        }

        console.error('Authentication failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Authentication could not be completed.',
        });
    }
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin permission required.',
        });
    }

    next();
}
