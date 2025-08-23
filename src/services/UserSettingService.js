const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Save or update a user setting
async function saveUserSetting(userId, key, value) {
    return await prisma.userSetting.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
    });
}

// Get all settings for a user
async function getUserSettings(userId) {
    return await prisma.userSetting.findMany({
        where: { userId },
    });
}

// Get a specific setting for a user
async function getUserSetting(userId, key) {
    return await prisma.userSetting.findUnique({
        where: { userId_key: { userId, key } },
    });
}

module.exports = {
    saveUserSetting,
    getUserSettings,
    getUserSetting,
};
