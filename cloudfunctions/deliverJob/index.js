// cloudfunctions/deliverJob/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const deliveryCollection = db.collection('delivery') // 投递表


/**
 * 云函数：deliverJob
 * 功能：删除用户该职位的所有旧记录，并创建一条新的最新投递记录 (覆盖逻辑)。
 */
exports.main = async (event, context) => {
    
    const { jobId, userId } = event;
    
    if (!jobId || !userId) {
        return { success: false, message: '职位ID或用户ID缺失，无法投递。' };
    }

    try {
        // 1. 检查是否有历史记录 (用于返回友好的提示)
        const historyRecords = await deliveryCollection.where({
            jobId: jobId,
            userId: userId
        }).get();
        
        const hasHistory = historyRecords.data.length > 0;
        
        // 2. ⭐ 核心修正：删除所有旧记录 (如果有)
        if (hasHistory) {
            // 使用 remove 方法删除所有匹配的记录
            const deleteResult = await deliveryCollection.where({
                jobId: jobId,
                userId: userId
            }).remove();
            
            console.log(`旧投递记录删除成功: ${deleteResult.stats.removed} 条`);
        }

        // 3. 创建新的投递记录
        const newDeliveryRecord = {
            jobId: jobId,
            userId: userId,
            status: '已投递', // 初始状态
            createdAt: db.serverDate(), 
        };
        
        const result = await deliveryCollection.add({
            data: newDeliveryRecord
        });

        // 4. 返回成功状态
        return {
            success: true,
            message: hasHistory ? '已更新投递记录！' : '简历投递成功！',
            deliveryId: result._id,
        };

    } catch (e) {
        console.error('投递云函数失败:', e);
        return { success: false, message: `服务器错误：${e.message}` };
    }
}