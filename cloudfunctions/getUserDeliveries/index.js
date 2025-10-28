// cloudfunctions/getUserDeliveries/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const $ = db.command.aggregate
const deliveryCollection = db.collection('delivery')
const jobsCollectionName = 'jobs' // 职位表名


/**
 * 云函数：getUserDeliveries
 * 功能：查询当前用户的投递记录，并联表获取职位详情，支持分页。
 * @param {string} event.userId - 用户ID
 * @param {number} [event.pageIndex=1] - 当前页码 (从 1 开始)
 * @param {number} [event.pageSize=10] - 每页记录数
 */
exports.main = async (event, context) => {

    const { userId, pageIndex = 1, pageSize = 10 } = event;

    if (!userId) {
        return { success: false, code: 400, message: '用户ID缺失，无法查询投递记录。' };
    }

    // 计算跳过的记录数
    const skipCount = (pageIndex - 1) * pageSize;
    // 确保 pageSize 和 skipCount 是有效数字
    const limitCount = parseInt(pageSize) || 10;
    const skip = Math.max(0, parseInt(skipCount));

    try {
        // -------------------------
        // 1. 获取总记录数 (用于分页信息)
        // -------------------------
        const countResult = await deliveryCollection.where({
            userId: userId
        }).count();
        const total = countResult.total;

        // -------------------------
        // 2. 聚合查询 (联表 + 分页)
        // -------------------------
        const aggregateResult = await deliveryCollection.aggregate()
            .match({
                userId: userId // 筛选当前用户的所有投递记录
            })
            .sort({
                createdAt: -1 // 最新投递在前
            })
            // 分页操作：先跳过，再限制数量
            .skip(skip)
            .limit(limitCount)
            // 联表查询 (Lookup)：关联 jobs 表
            .lookup({
                from: jobsCollectionName,
                localField: 'jobId', // delivery 表中的字段
                foreignField: '_id', // jobs 表中的字段
                as: 'jobDetails' // 关联结果的数组名称
            })
            .unwind({
                path: '$jobDetails',
                preserveNullAndEmptyArrays: false // 确保只有匹配成功的记录才被保留
            })
            // 投影 (Project)：构造最终返回的结构
            .project({
                _id: '$_id',
                jobId: '$jobId',
                status: '$status',
                deliveryDate: '$createdAt', // 使用 createdAt 作为投递时间

                // 提取职位详情 (使用 jobs 表的字段)
                job_duty: '$jobDetails.jobDuty',
                job_name: '$jobDetails.title',
                job_img: '$jobDetails.img',
                job_type: '$jobDetails.type',
                salary_range: '$jobDetails.salaryRange',
            })
            .end();


        // -------------------------
        // 3. 格式化和返回结果
        // -------------------------
        const formattedDeliveries = aggregateResult.list.map(item => ({
            ...item,
            // 兼容前端可能需要的字段名
            image: item.job_img,
            statusKey: item.status === '已投递' ? 'delivered' : 'pending',
            // 注意：deliveryDate 是一个 Date 对象，前端可能需要进一步格式化
        }));

        const hasMore = skip + formattedDeliveries.length < total;

        return {
            success: true,
            code: 0,
            message: '投递记录加载成功',
            deliveries: formattedDeliveries,
            pageIndex: pageIndex,
            pageSize: limitCount,
            total: total,
            hasMore: hasMore
        };

    } catch (e) {
        console.error('getUserDeliveries 联表查询失败:', e);
        return { success: false, code: 500, message: `服务器错误：${e.message}` };
    }
}