// cloudfunctions/userUpdate/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const userCollection = db.collection('users') 


exports.main = async (event, context) => {
    
    // 1. 显式提取所有客户端发送的字段
    const { 
        userId, nickName, phone, avatarUrl, 
        gender, age, region, education, isFullTime, 
        schoolName, major, graduationDate, resumeFileID
    } = event; 

    if (!userId) {
        return { success: false, message: '用户ID缺失，无法更新' };
    }

    // 2. 构造需要更新的数据对象 (只包含业务字段和时间戳)
    const updateData = {};
    
    // 基础信息
    if (nickName !== undefined) updateData.nickName = nickName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    
    // 手机号 (允许更新为 null 或空字符串)
    if (phone !== undefined) updateData.phone = phone ? phone : null; 
    
    // 教育/其他信息
    if (gender !== undefined) updateData.gender = gender;
    if (age !== undefined) updateData.age = parseInt(age);
    if (region !== undefined) updateData.region = region;
    if (education !== undefined) updateData.education = education;
    if (isFullTime !== undefined) updateData.isFullTime = isFullTime; // 这是一个布尔值
    if (schoolName !== undefined) updateData.schoolName = schoolName;
    if (major !== undefined) updateData.major = major;
    if (graduationDate !== undefined) updateData.graduationDate = graduationDate;
    if (resumeFileID !== undefined) updateData.resumeFileID = resumeFileID;
    
    updateData.updatedAt = db.serverDate(); // 更新时间戳

    if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
        // 只有时间戳更新，但我们仍需执行 update
    }

    try {
        // 3. 执行数据库更新操作
        await userCollection.doc(userId).update({
            data: updateData
        });

        // 4. 获取更新后的最新完整用户信息
        // 查回原始数据，并用 updateData 覆盖，以获取最新的完整对象
        const userRecord = await userCollection.doc(userId).get();
        
        if (userRecord.data) {
            const finalUserInfo = userRecord.data;

            // ⭐ 关键：返回最新的完整用户信息，供客户端更新缓存
            return { 
                success: true, 
                message: '更新成功',
                userInfo: finalUserInfo 
            };
        } else {
            return { success: false, message: '更新成功，但无法获取最新用户资料' };
        }

    } catch (e) {
        console.error('用户资料更新失败:', e);
        return { success: false, message: `数据库更新失败: ${e.message}` };
    }
}