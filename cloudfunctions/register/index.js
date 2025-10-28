// cloudfunctions/register/index.js

const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken') 

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const userCollection = db.collection('users') 

const JWT_SECRET = '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM,./' 
const JWT_EXPIRES_IN = '7d' 

// ... (migrateResumeFile, getLoginInfo 保持不变) ...

/**
 * 处理简历文件移动和重命名 (OpenID路径 -> UserID路径)
 */
async function migrateResumeFile(oldFileID, newUserId) {
    if (!oldFileID) return '';
    
    let fileName = `resume_${Date.now()}_temp.pdf`; 
    
    try {
        const metadataResult = await cloud.getStorage().getMetadata({ fileList: [{ fileID: oldFileID }] });
        const filePath = metadataResult.fileList[0] && metadataResult.fileList[0].path;
        if (filePath) {
            const fileNameMatch = filePath.match(/\/([^/]+)$/);
            if (fileNameMatch) { fileName = fileNameMatch[1]; }
        }
    } catch (e) {
        console.warn('获取文件元数据失败，使用默认文件名。');
    }
    
    const newCloudPath = `简历/${newUserId}/${fileName}`; 
    
    try {
        const copyResult = await cloud.getStorage().copyFile({ fileId: oldFileID, newPath: newCloudPath });
        
        if (copyResult.code === 'SUCCESS') {
            const newFileID = copyResult.newFileId;
            await cloud.deleteFile({ fileIds: [oldFileID] });
            return newFileID;
        } else {
            console.error('文件复制失败:', copyResult);
            return oldFileID; 
        }
    } catch (error) {
        console.error('迁移简历文件时发生错误:', error);
        return oldFileID; 
    }
}


/**
 * 封装 OpenID/UnionID 获取逻辑
 */
async function getLoginInfo(code) {
    try {
        const res = await cloud.auth().code2Session({ code: code });
        return {
            openid: res.openid,
            unionid: res.unionid || null
        };
    } catch (e) {
        const wxContext = cloud.getWXContext();
        if (wxContext.OPENID) {
            return {
                openid: wxContext.OPENID,
                unionid: wxContext.UNIONID || null
            };
        }
        throw new Error('AUTH_FAILED');
    }
}


exports.main = async (event, context) => {
    
    // ⭐ 显式提取所有字段，包括 phone
    const { code, openid, resumeFileID, nickName, avatarUrl, gender, age, region, education, isFullTime, schoolName, major, graduationDate, phone } = event; 

    // 1. 验证身份并获取最新的 OpenID/UnionID
    let loginInfo;
    try {
        loginInfo = await getLoginInfo(code);
    } catch (e) {
        return { success: false, message: '无法通过 code 换取 OpenID' };
    }
    const finalOpenid = loginInfo.openid;
    const finalUnionid = loginInfo.unionid;

    if (!finalOpenid) {
        return { success: false, message: 'OpenID缺失，无法注册。' }
    }
    
    // 2. 检查用户是否已注册 (防止重复注册)
    let userRecord = await userCollection.where({ openid: finalOpenid }).get();
    if (userRecord.data.length > 0) {
        return { success: false, message: '用户已注册，请直接登录。' }
    }
    
    // 3. 最终注册：将所有完整数据写入数据库
    
    // 核心清理：构造只包含业务和身份信息的纯净对象
    let userInfoToStore = {
        // 身份标识
        openid: finalOpenid, 
        unionid: finalUnionid,
        
        // 业务数据 (确保 phone 字段在这里)
        nickName: nickName, 
        avatarUrl: avatarUrl, 
        phone: phone, // ⭐ 关键：写入 phone 字段
        gender: gender, 
        age: age ? parseInt(age) : null,
        region: region, 
        education: education, 
        isFullTime: isFullTime, 
        schoolName: schoolName, 
        major: major, 
        graduationDate: graduationDate,
        resumeFileID: resumeFileID,
        
        // 时间戳
        createdAt: db.serverDate(),
        lastLoginAt: db.serverDate(),
    };
    
    // 最终清理：再次过滤掉所有 undefined/null 的字段
    const finalStoreData = {};
    for(const key in userInfoToStore) {
        if (userInfoToStore[key] !== undefined && userInfoToStore[key] !== null) {
            finalStoreData[key] = userInfoToStore[key];
        }
    }
    
    try {
        // 1. 注册，获取 userId
        const addRes = await userCollection.add({ data: finalStoreData });
        const userId = addRes._id; 
        
        // 2. 迁移简历文件
        let finalResumeFileID = resumeFileID;
        if (resumeFileID) {
            finalResumeFileID = await migrateResumeFile(resumeFileID, userId);
            
            // 3. 更新数据库中的 FileID（指向最终路径）
            await userCollection.doc(userId).update({ data: { resumeFileID: finalResumeFileID } });
        }
        
        // 4. 构造返回对象
        const fullUserObject = { ...finalStoreData, _id: userId, resumeFileID: finalResumeFileID };

        // 5. 签发 JWT Token 
        const payload = { userId: userId, openid: finalOpenid };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        return {
            success: true,
            message: '注册成功！',
            token: token,
            userId: userId,
            userInfo: fullUserObject 
        }

    } catch (e) {
        console.error('注册云函数错误：', e);
        return { success: false, message: '服务器注册失败。' }
    }
}