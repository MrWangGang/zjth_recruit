// cloudfunctions/getJobDetail/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const jobsCollection = db.collection('jobs')
const deliveryCollection = db.collection('delivery') // 投递表


/**
 * 云函数：getJobDetail
 * 功能：根据职位ID获取详情，并获取用户最新的投递状态和记录ID。
 */
exports.main = async (event, context) => {
    
    // 显式提取 jobId 和 userId
    const { jobId, userId } = event;
    
    if (!jobId) {
        return { success: false, message: '职位ID缺失' };
    }

    try {
        // 1. 获取职位详情
        const jobResult = await jobsCollection.doc(jobId).get();
        
        if (!jobResult.data) {
            return { success: false, message: '未找到该职位信息' };
        }
        
        let jobDetail = jobResult.data;
        
        // 2. 检查投递状态（获取最新的投递记录）
        let latestDelivery = null; // 用于存储最新的投递记录
        let deliveryStatus = '未登录';
        let deliveryRecordId = null;
        let isDeliveredBefore = false;

        if (userId) {
            const deliveryRecords = await deliveryCollection.where({
                jobId: jobId,
                userId: userId
            })
            // ⭐ 关键：按时间倒序排列，确保拿到最新的一条记录
            .orderBy('createdAt', 'desc') 
            .limit(1)
            .get();
            
            if (deliveryRecords.data.length > 0) {
                latestDelivery = deliveryRecords.data[0];
                isDeliveredBefore = true;
                
                // ⭐ 关键：获取最新的投递状态和记录ID
                deliveryStatus = latestDelivery.status || '已投递'; // 假设 status 字段存在
                deliveryRecordId = latestDelivery._id;
            } else {
                deliveryStatus = '未投递';
            }
        }
        
        // ⭐ 注入投递历史状态、最新状态和记录ID
        jobDetail.hasDeliveryHistory = isDeliveredBefore;
        jobDetail.latestDeliveryStatus = deliveryStatus;
        jobDetail.deliveryRecordId = deliveryRecordId; // 注入投递记录的 _id
        
        // 3. 返回最终结果
        return {
            success: true,
            jobDetail: jobDetail
        };

    } catch (e) {
        console.error('获取职位详情云函数失败:', e);
        return { success: false, message: `服务器错误: ${e.message}` };
    }
}