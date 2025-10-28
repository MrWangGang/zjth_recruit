// cloudfunctions/auth/index.js

const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken') 

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const userCollection = db.collection('users') 

const JWT_SECRET = '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM,./' 
const JWT_EXPIRES_IN = '7d' 


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
    
    // ⭐ 接收 phone 字段，但仅用于更新
    const { code, nickName, avatarUrl, phone } = event; 
    
    let loginInfo;
    try {
        loginInfo = await getLoginInfo(code);
    } catch (e) {
        return { success: false, message: '无法通过 code 换取 OpenID' };
    }
    
    const clientOpenid = loginInfo.openid;
    const clientUnionid = loginInfo.unionid;

    if (!clientOpenid) {
        return { success: false, message: '无法获取 OpenID，授权失败。' }
    }
    
    try {
        let userRecord = await userCollection.where({ openid: clientOpenid }).get()

        if (userRecord.data.length === 0) {
            // 新用户：查不到记录，只返回 openid
            return { 
                success: false, 
                message: '未注册', 
                userInfo: { openid: clientOpenid } 
            }
        }
        
        // 老用户：查到记录
        const data = userRecord.data[0];
        const userId = data._id; 
        
        // 准备更新的数据：只包含允许更新的字段
        const updateData = {
            lastLoginAt: db.serverDate(),
            
            // 更新客户端传来的基础信息
            nickName: nickName || data.nickName,
            avatarUrl: avatarUrl || data.avatarUrl,
            // 只有当客户端在第二步提交时才可能更新 phone，这里只在有新值且不为空时更新
            phone: phone || data.phone || null, 
            
            // 更新 unionid（如果新值存在）
            unionid: clientUnionid || data.unionid || null, 
        };

        // 核心清理：排除所有 undefined/null 的字段
        const finalUpdateData = {};
        for (const key in updateData) {
            if (updateData[key] !== undefined && updateData[key] !== null) {
                finalUpdateData[key] = updateData[key];
            }
        }
        
        // ⭐ 关键：只在有实际数据需要更新时执行
        if (Object.keys(finalUpdateData).length > 0) {
            await userCollection.doc(userId).update({ data: finalUpdateData });
        }

        // 构建返回对象：合并旧数据和更新后的数据
        const fullUserObject = { ...data, ...finalUpdateData };
        
        // 签发 JWT Token 
        const payload = { userId: userId, openid: clientOpenid };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return {
            success: true,
            message: '登录成功！',
            token: token,
            userId: userId,
            userInfo: fullUserObject 
        }

    } catch (e) {
        console.error('严重错误：数据库查询失败。', e)
        return { success: false, message: '服务器处理失败：数据库错误。' }
    }
}