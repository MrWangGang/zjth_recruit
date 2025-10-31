// cloudfunctions/deliverJob/index.js (修正版：写入 delivery_view)
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const deliveryCollection = db.collection('delivery')       // 原始投递表 (用于存储核心关系)
const usersCollection = db.collection('users')             // 用户表
const jobsCollection = db.collection('jobs')               // 职位表
const deliveryViewCollection = db.collection('delivery_view') // 【新增】展平视图表


/**
 * 云函数：deliverJob
 * 功能：删除用户该职位的所有旧记录，创建新投递记录，并创建展平后的 delivery_view 记录。
 */
exports.main = async (event, context) => {
    
    const { jobId, userId } = event;
    
    if (!jobId || !userId) {
        return { success: false, message: '职位ID或用户ID缺失，无法投递。' };
    }

    try {
        // --- 1. 获取 users 和 jobs 详情（并发查询，提高效率） ---
        const [userRes, jobRes] = await Promise.all([
            usersCollection.doc(userId).get().catch(() => ({ data: null })), // 找不到不抛出异常
            jobsCollection.doc(jobId).get().catch(() => ({ data: null })),
        ]);
        
        const user = userRes.data;
        const job = jobRes.data;
        
        if (!user || !job) {
             return { 
                success: false, 
                message: '投递失败：未找到对应的用户或职位信息。',
                data: { userFound: !!user, jobFound: !!job }
             };
        }


        // --- 2. 删除旧记录 (delivery 和 delivery_view) ---
        // 核心：查询条件
        const whereCondition = { jobId: jobId, userId: userId };

        // 检查是否有历史记录（用于提示和判断是否需要删除）
        const historyCount = await deliveryCollection.where(whereCondition).count();
        const hasHistory = historyCount.total > 0;
        
        if (hasHistory) {
            // 删除原始 delivery 表中的旧记录
            await deliveryCollection.where(whereCondition).remove();
            
            // 【新增】删除 delivery_view 表中的旧记录
            await deliveryViewCollection.where(whereCondition).remove();
            
            console.log(`旧投递记录删除成功 (delivery & delivery_view)。`);
        }


        // --- 3. 创建新的投递记录 (同时写入两张表) ---
        const newCoreDeliveryRecord = {
            jobId: jobId,
            userId: userId,
            status: '已投递', // 初始状态
            createdAt: db.serverDate(), 
        };
        
        // 写入原始 delivery 表（保留核心关系）
        const coreResult = await deliveryCollection.add({
            data: newCoreDeliveryRecord
        });

        // 构造展平后的视图记录
        const newDeliveryViewRecord = {
            // 核心 ID
            _id: coreResult._id, // 使用和 delivery 表相同的 _id
            jobId: jobId,
            userId: userId,
            createdAt: newCoreDeliveryRecord.createdAt,
            status: newCoreDeliveryRecord.status,
            
            // 【展平 Users 信息】
            nickName: user.nickName,
            age: user.age,
            education: user.education,
            gender: user.gender,
            graduationDate: user.graduationDate,
            isFullTime: user.isFullTime,
            major: user.major,
            phone: user.phone,
            region: user.region,
            schoolName: user.schoolName,
            resumeFileID: user.resumeFileID,

            // 【展平 Jobs 信息】
            // 注意：如果 jobs 表中的字段名与 users 表中的字段名相同（例如：status），
            // 它们将在这里被覆盖。这里我们保留 job 自身的 status 作为最终的 status。
            title: job.title,
            type: job.type,
            salaryRange: job.salaryRange,
            
            // 如果需要保留 job 的原始 status，应该在核心记录中存储 delivery status，
            // 并在视图中添加 jobStatus: job.status
            // status: newCoreDeliveryRecord.status, // 使用 delivery status
        };

        // 写入 delivery_view 表
        await deliveryViewCollection.add({
             data: newDeliveryViewRecord
        });


        // --- 4. 返回成功状态 ---
        return {
            success: true,
            message: hasHistory ? '已更新投递记录！' : '简历投递成功！',
            deliveryId: coreResult._id,
        };

    } catch (e) {
        console.error('投递云函数失败:', e);
        return { success: false, message: `服务器错误：${e.message}` };
    }
}