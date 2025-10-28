// components/authorize/authorize.js

// ================================================
// ⭐ 核心登录服务逻辑 (AUTH CORE) ⭐
// ================================================

const CLOUD_FUNCTION_NAME = 'auth';     // 登录/查询云函数
const REGISTER_FUNCTION_NAME = 'register'; // 注册云函数
const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

const checkLoginStatus = () => {
    return !!wx.getStorageSync('userToken'); 
};

const getCachedOpenId = () => {
    const userInfo = wx.getStorageSync('userInfo');
    return userInfo ? userInfo.openid : null; 
};

/**
 * 通用云函数调用封装
 */
const callCloudFunction = (name, userInfo, finalSuccessCallback) => {
    wx.showToast({ title: name === CLOUD_FUNCTION_NAME ? '正在登录...' : '正在注册...', icon: 'loading', duration: 1500 });
    
    wx.cloud.callFunction({
        name: name,
        data: userInfo, 
        success: res => {
            if (res.result && res.result.success) {
                const { token, userInfo: remoteUserInfo } = res.result;
                
                // 存储 token 和完整的 userInfo
                wx.setStorageSync('userToken', token);
                wx.setStorageSync('userInfo', remoteUserInfo); 
                
                wx.showToast({ title: name === CLOUD_FUNCTION_NAME ? '登录成功' : '注册成功', icon: 'success', duration: 1500 });
                finalSuccessCallback(true, remoteUserInfo, null); 
            } else {
                wx.showToast({ title: res.result.message || '操作失败', icon: 'error' });
                finalSuccessCallback(false, res.result.userInfo || null, res.result.message); 
            }
        },
        fail: (err) => {
            console.error('云函数调用失败', err);
            wx.showToast({ title: '网络错误', icon: 'none' });
            finalSuccessCallback(false, null, '网络错误'); 
        }
    });
};

const checkAndAuthorize = (userInfo, finalSuccessCallback) => {
    wx.login({
        success: (loginRes) => {
            const code = loginRes.code;
            const dataToSend = { ...userInfo, code: code };
            callCloudFunction(CLOUD_FUNCTION_NAME, dataToSend, finalSuccessCallback);
        },
        fail: () => {
            wx.showToast({ title: '微信登录接口失败', icon: 'error' });
            finalSuccessCallback(false, null, '微信登录失败');
        }
    });
};


// ================================================
// ⭐ 组件 Component 定义 ⭐
// ================================================

Component({
    data: {
        authAvatarUrl: DEFAULT_AVATAR_URL, 
        authNickName: '', 
        defaultAvatarUrl: DEFAULT_AVATAR_URL, 
        isAuthModalVisible: false,
        
        authStep: 'basic', 
        
        // --- 表单数据 ---
        phoneNumber: '', // 手机号字段
        gender: '', 
        age: '',    
        region: [], 
        regionDisplay: '请选择籍贯 (必选)', 
        educationArray: ['高中', '大专', '专升本', '本科', '硕士', '博士'],
        educationIndex: null, 
        isFullTime: '', 
        schoolName: '',     
        major: '',          
        graduationDate: '', 
        resumePath: '',     
        resumeFileName: '未选择文件', 
        
        tempOpenId: null 
    },

    lifetimes: {
        attached() {
            if (!checkLoginStatus()) {
                this.setData({ isAuthModalVisible: true, authStep: 'basic' });
            } else {
                this.setData({ isAuthModalVisible: false, authStep: 'done' });
            }
        }
    },

    methods: {
        // --- 基础事件 ---
        onChooseAvatar(e) {
            const newAvatarUrl = e.detail.avatarUrl;
            if (newAvatarUrl) {
                this.setData({ authAvatarUrl: newAvatarUrl });
                wx.showToast({ title: '头像已选定', icon: 'none' });
            } else {
                wx.showToast({ title: '选择头像失败', icon: 'error' });
            }
        },
        onNicknameInput(e) {
            this.setData({ authNickName: e.detail.value.trim() }); 
        },
        // ⭐ 手机号输入方法保留，用于收集数据
        onPhoneInput(e) {
            this.setData({ phoneNumber: e.detail.value.trim() });
        },
        selectGender(e) {
            this.setData({ gender: e.currentTarget.dataset.value });
        },
        onAgeInput(e) {
            this.setData({ age: e.detail.value.replace(/\D/g, '') });
        },
        onRegionChange(e) {
            const newRegion = e.detail.value;
            let newRegionDisplay = newRegion.length ? newRegion.join(' ') : '请选择籍贯 (必选)';
            this.setData({ region: newRegion, regionDisplay: newRegionDisplay });
        },
        onEducationChange(e) {
            this.setData({ educationIndex: parseInt(e.detail.value) });
        },
        selectFullTime(e) {
            this.setData({ isFullTime: e.currentTarget.dataset.value });
        },
        onSchoolNameInput(e) {
            this.setData({ schoolName: e.detail.value.trim() });
        },
        onMajorInput(e) {
            this.setData({ major: e.detail.value.trim() });
        },
        onDateChange(e) {
            this.setData({ graduationDate: e.detail.value });
        },
        chooseResume() {
            wx.chooseMessageFile({
                count: 1, type: 'file', extension: ['pdf'], 
                success: (res) => {
                    const tempFile = res.tempFiles[0];
                    if (tempFile.name.toLowerCase().endsWith('.pdf')) {
                        this.setData({ 
                            resumePath: tempFile.path, 
                            resumeFileName: tempFile.name || '已选择文件.pdf' 
                        });
                        wx.showToast({ title: '简历已选定', icon: 'none' });
                    } else {
                         wx.showToast({ title: '请选择 PDF 文件', icon: 'error' });
                    }
                },
                fail: () => {
                    wx.showToast({ title: '选择文件失败', icon: 'none' });
                }
            });
        },
        
        /** 封装：调用 wx.cloud.uploadFile 上传文件 (使用组件 data 中的 OpenID 作为临时路径前缀) */
        uploadResume(tempFilePath, fileName) {
            const tempId = this.data.tempOpenId || getCachedOpenId(); 

            if (!tempId) {
                wx.showToast({ title: '请先完成授权登录', icon: 'error' });
                return Promise.reject(new Error('无法获取 OpenID'));
            }
            
            wx.showLoading({ title: '正在上传简历...', mask: true });
            
            const cloudPath = `简历/${tempId}/${Date.now()}_${fileName}`;
            
            return new Promise((resolve, reject) => {
                wx.cloud.uploadFile({
                    cloudPath: cloudPath, 
                    filePath: tempFilePath, 
                    success: res => { 
                        wx.hideLoading(); 
                        resolve(res.fileID); 
                    },
                    fail: err => { 
                        wx.hideLoading(); 
                        wx.showToast({ title: '简历上传失败', icon: 'error' }); 
                        reject(new Error('简历上传失败')); 
                    }
                });
            });
        },

        // ===================================
        // ⭐ 第一步：基本信息授权/登录 (查询用户)
        // ===================================
        async handleBasicAuthSubmit() {
            const { authAvatarUrl, defaultAvatarUrl, authNickName } = this.data; // 移除 phoneNumber

            const isAvatarSelected = authAvatarUrl !== defaultAvatarUrl;
            if (!isAvatarSelected) { wx.showToast({ title: '请选择头像', icon: 'none' }); return; }
            if (!authNickName.trim()) { wx.showToast({ title: '姓名不能为空', icon: 'none' }); return; }
            
            // 1. 构造基础用户信息 (不包含 phone 字段)
            const basicUserInfo = { 
                nickName: authNickName, 
                avatarUrl: authAvatarUrl,
                // phone 字段不发送
            };
            
            // 2. 调用 checkAndAuthorize (会调用 wx.login 获取 code)
            checkAndAuthorize(basicUserInfo, (isSuccess, remoteUserInfo, message) => {
                wx.hideToast(); 
                
                if (isSuccess) {
                    this.handleLoginSuccess(remoteUserInfo);
                } else {
                    if (message && message.includes('未注册')) { 
                        
                        if (remoteUserInfo && remoteUserInfo.openid) {
                            // 切换到第二步，并存储 OpenID
                            this.setData({ 
                                authStep: 'full',
                                tempOpenId: remoteUserInfo.openid 
                            });
                        } else {
                            wx.showToast({ title: '获取 OpenID 失败，请重试', icon: 'error' });
                            return;
                        }

                        wx.showToast({ title: '新用户，请完善信息', icon: 'none' });
                        
                        // 预填充已有的信息
                        this.setData({
                            authNickName: authNickName,
                            authAvatarUrl: authAvatarUrl, 
                        });
                    } else {
                        wx.showToast({ title: message || '登录查询失败', icon: 'error' });
                    }
                }
            });
        },

        // ===================================
        // ⭐ 第二步：提交完整资料 (注册)
        // ===================================
        async submitAuthAndLogin() {
            const { authNickName, gender, age, region, educationIndex, educationArray, isFullTime, schoolName, major, graduationDate, resumePath, resumeFileName, regionDisplay, phoneNumber, tempOpenId } = this.data;
            
            // 1. 必填项校验 (针对完整表单，手机号不再是必填项)
            const requiredFields = [
                [!!authNickName.trim(), '姓名不能为空'], 
                [!!phoneNumber.trim(), '手机号不能为空'], // ⭐ 移除手机号必填校验
                [!!gender, '请选择性别'], 
                [!!age.trim(), '年龄不能为空'], 
                [region.length > 0, '请选择籍贯'], 
                [educationIndex !== null, '请选择学历'], 
                [!!isFullTime, '请选择是否全日制'], 
                [!!schoolName.trim(), '院校名称不能为空'], 
                [!!major.trim(), '专业名称不能为空'], 
                [!!graduationDate, '请选择毕业时间'], 
                [!!resumePath, '请上传简历']
            ];

            for (const [condition, message] of requiredFields) {
                if (!condition) { wx.showToast({ title: message, 'icon:': 'none' }); return; }
            }
            
            // 2. 上传简历
            let resumeFileID = '';
            try {
                resumeFileID = await this.uploadResume(resumePath, resumeFileName);
            } catch (error) {
                return; 
            }
            
            // 3. 构造完整的用户信息对象
            const userInfo = { 
                nickName: authNickName, 
                avatarUrl: this.data.authAvatarUrl, 
                phone: phoneNumber.trim() || null, // ⭐ 关键：发送手机号，如果是空字符串则发送 null
                gender: gender, age: parseInt(age), 
                region: regionDisplay, 
                education: educationArray[educationIndex], 
                isFullTime: isFullTime === '是', schoolName: schoolName, major: major, 
                graduationDate: graduationDate, 
                resumeFileID: resumeFileID, 
                
                openid: tempOpenId, 
            };
            
            // 4. 调用注册云函数
            wx.login({
                success: (loginRes) => {
                    const dataToSend = { ...userInfo, code: loginRes.code };
                    callCloudFunction(REGISTER_FUNCTION_NAME, dataToSend, (isSuccess, remoteUserInfo) => {
                        if (isSuccess) {
                            this.setData({ authStep: 'done' }); 
                            this.handleLoginSuccess(remoteUserInfo);
                        }
                    });
                },
                fail: () => {
                    wx.showToast({ title: '微信登录接口失败', icon: 'error' });
                }
            });
        },
        
        handleLoginSuccess(userInfo) {
            this.setData({ isAuthModalVisible: false }); 
            this.triggerEvent('loginsuccess', { userInfo: userInfo }); 
        }
    }
});