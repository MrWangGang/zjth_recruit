// owner_profile.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // ⭐ 最小化 data 声明，用于 WXML 绑定和状态管理
    userId: null, 
    isSaving: false, 

    // WXML 绑定和缓存加载的字段
    avatar: null, 
    name: null, 
    userNum: null,  
    phoneNumber: null,

    // 所有注册页面的业务字段
    gender: null,
    age: null,
    region: [], // 籍贯 (省市区数组)
    regionDisplay: null, // 籍贯显示字符串
    educationArray: ['高中', '大专', '专升本', '本科', '硕士', '博士'],
    educationIndex: null, // 学历索引
    education: null, // 学历字符串
    isFullTime: null,
    schoolName: null,
    major: null,
    graduationDate: null,
    resumePath: null, // 简历路径 (File ID 或本地临时路径)
    resumeFileName: '未选择文件', // ⭐ 文件名回显
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function() {
    const cachedUserInfo = wx.getStorageSync('userInfo');
    const currentUserId = cachedUserInfo ? (cachedUserInfo._id || cachedUserInfo.userId) : null;
    
    if (currentUserId) {
      
      let initialData = {
        userId: currentUserId,
        
        // 基础信息
        avatar: cachedUserInfo.avatarUrl || null,
        name: cachedUserInfo.nickName || null,
        userNum: currentUserId,
        phoneNumber: cachedUserInfo.phone || null,

        // 映射所有注册字段
        gender: cachedUserInfo.gender || null,
        age: cachedUserInfo.age || null,
        region: (cachedUserInfo.region && typeof cachedUserInfo.region === 'string') ? cachedUserInfo.region.split(' ') : [],
        regionDisplay: cachedUserInfo.region || '请选择籍贯 (必选)',
        education: cachedUserInfo.education || null,
        educationIndex: cachedUserInfo.education ? this.data.educationArray.indexOf(cachedUserInfo.education) : null,
        isFullTime: cachedUserInfo.isFullTime === true ? '是' : (cachedUserInfo.isFullTime === false ? '否' : null),
        schoolName: cachedUserInfo.schoolName || null,
        major: cachedUserInfo.major || null,
        graduationDate: cachedUserInfo.graduationDate || null,
        resumePath: cachedUserInfo.resumeFileID || null, // 简历文件ID
      };
      
      // ⭐ 关键修正：加载文件名逻辑
      if (initialData.resumePath) {
        initialData.resumeFileName = this.extractFileName(initialData.resumePath);
      } else {
        initialData.resumeFileName = '未选择文件';
      }

      this.setData(initialData);

    } else {
      wx.showModal({
        title: '提示',
        content: '用户登录信息缺失，请返回个人中心登录。',
        showCancel: false,
        success: (res) => {
          wx.navigateBack();  
        }
      });
    }
  },

  /**
   * ⭐ 辅助函数：从云文件 ID 中提取文件名 (用于回显)
   */
  extractFileName: function(fileID) {
    if (!fileID || typeof fileID !== 'string') return '已上传文件';

    const lastSlashIndex = fileID.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      const pathSegment = fileID.substring(lastSlashIndex + 1);
      const firstUnderscoreIndex = pathSegment.indexOf('_');
      // 尝试匹配上传时的格式: [时间戳]_[文件名]
      if (firstUnderscoreIndex !== -1 && pathSegment.length > firstUnderscoreIndex + 1) {
        return pathSegment.substring(firstUnderscoreIndex + 1); 
      }
      return pathSegment; 
    }
    return '已上传简历';
  },

  // ---------------------------------------------
  // ⭐ 所有输入事件处理函数
  // ---------------------------------------------
  inputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [field]: value
    });
  },

  onNicknameInput: function(e) { this.inputChange(e); },
  onPhoneInput: function(e) { this.inputChange(e); },
  onAgeInput: function(e) { this.setData({ age: e.detail.value.replace(/\D/g, '') }); },
  onSchoolNameInput: function(e) { this.inputChange(e); },
  onMajorInput: function(e) { this.inputChange(e); },
  selectGender: function(e) { this.setData({ gender: e.currentTarget.dataset.value }); },
  selectFullTime: function(e) { this.setData({ isFullTime: e.currentTarget.dataset.value }); },
    
  onRegionChange: function(e) {
    const newRegion = e.detail.value;
    const newRegionDisplay = newRegion.join(' ');
    this.setData({ 
      region: newRegion, 
      regionDisplay: newRegionDisplay
    });
  },
    
  onEducationChange: function(e) {
    const index = parseInt(e.detail.value);
    this.setData({ 
      educationIndex: index,
      education: this.data.educationArray[index] // 存储学历字符串
    });
  },

  onDateChange: function(e) {
    this.setData({ graduationDate: e.detail.value });
  },

  // ---------------------------------------------
  
  chooseAvatar: function() {
    if (!this.data.userId) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        this.setData({
          avatar: tempFilePath
        });
        
        wx.showModal({
          title: '头像已选择',
          content: '请点击下方“确定”按钮进行上传和更新。',
          showCancel: false
        });
      }
    });
  },

  chooseResume: function() {
    if (!this.data.userId) return;
    
    // ⭐⭐⭐ 已修改为 wx.chooseMedia 并移除 PDF 检查 ⭐⭐⭐
    wx.chooseMedia({
        count: 1, 
        mediaType: ['mix'], // 选择图片和视频
        sourceType: ['album', 'camera'], // 允许从相册或相机选择
        
        success: (res) => {
            const tempFile = res.tempFiles[0];
            const tempFilePath = tempFile.tempFilePath;
            
            if (tempFilePath) {
                // 移除 PDF 后缀检查，接受任何 wx.chooseMedia 返回的文件
                this.setData({ 
                    resumePath: tempFilePath, 
                    // 尝试构造文件名，使用路径的最后一部分
                    // 由于 wx.chooseMedia 不返回文件名，这里使用路径的最后一段作为文件名
                    resumeFileName: tempFilePath.split('/').pop() || '已选择文件' 
                });
                wx.showToast({ title: '简历已选定', icon: 'none' });
            } else {
                // 仅处理选择文件失败的情况
                wx.showToast({ title: '选择文件失败', icon: 'none' });
            }
        },
        fail: () => {
            wx.showToast({ title: '选择文件失败', icon: 'none' });
        }
    });
  },
    
  /** 辅助函数：上传简历文件 */
  uploadResumeFile: async function(tempFilePath, userId, fileName) {
    wx.showLoading({ title: '正在上传简历...', mask: true });
    // 注意：这里的 cloudPath 中仍然包含 'resume.pdf'，但实际上传的文件类型已不确定
    const cloudPath = `avatars/${userId}/resume_${new Date().getTime()}_${fileName}`;
    
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath, 
        filePath: tempFilePath, 
      });
      wx.hideLoading();
      return uploadRes.fileID;
    } catch(e) {
      wx.hideLoading();
      wx.showToast({ title: '简历上传失败', icon: 'error' });
      throw new Error('Upload Failed');
    }
  },


  /**
   * 【核心】点击“确定”按钮，执行数据提交和更新
   */
  savePet: async function() {
    const userId = this.data.userId;
    if (!userId || this.data.isSaving) {
      wx.showModal({  title: '提示', content: '请先登录或正在保存中。', showCancel: false  });
      return;
    }

    this.setData({  isSaving: true  }); 

    let { name, phoneNumber, avatar, gender, age, regionDisplay, education, isFullTime, schoolName, major, graduationDate, resumePath, resumeFileName } = this.data;
    
    // 1. 前端基础校验 (与注册页一致)
    const requiredFields = [
        // 注意：这里没有手机号的必填校验，因为 savePet 逻辑通常是对已有用户的更新，
        // 且前端没有要求在此处添加手机号必填校验 (只要求保留之前的手机号格式校验)。
        [!!name, '昵称不能为空'],
        [!!gender, '请选择性别'],
        [!!age, '年龄不能为空'],
        [!!regionDisplay && regionDisplay !== '请选择籍贯 (必选)', '请选择籍贯'],
        [!!education, '请选择学历'],
        [!!isFullTime, '请选择是否全日制'],
        [!!schoolName, '院校名称不能为空'],
        [!!major, '专业名称不能为空'],
        [!!graduationDate, '请选择毕业时间'],
        [!!resumePath, '请上传简历']
    ];

    for (const [condition, message] of requiredFields) {
      if (!condition) { 
        this.setData({ isSaving: false });
        wx.showModal({ title: '保存失败', content: message, showCancel: false });
        return;
      }
    }
      
    // 手机号校验 (如果输入了，则校验格式)
    if (phoneNumber && phoneNumber.length > 0 && !/^1[3-9]\d{9}$/.test(phoneNumber)) {
      this.setData({  isSaving: false });
      wx.showModal({  title: '保存失败', content: '手机号格式不正确。', showCancel: false  });
      return;
    }
    
    wx.showLoading({  title: '正在保存并上传...' });
    
    try {
      let finalResumeFileID = resumePath;
      let finalAvatarUrl = avatar;
      
      // 2. 处理头像上传 (如果头像路径是本地临时路径)
      if (avatar && (avatar.startsWith('wxfile://') || avatar.startsWith('http://tmp/'))) {
        const cloudPath = `avatars/${userId}_${new Date().getTime()}.png`;
        const uploadRes = await wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: avatar });
        finalAvatarUrl = uploadRes.fileID;
      }
      
      // 3. 处理简历上传 (如果简历路径是本地临时路径)
      if (resumePath && !resumePath.startsWith('cloud://')) {
        // 由于移除了 PDF 检查，这里使用 resumeFileName，若没有则用 'resume' + 路径后缀
        const defaultFileName = resumePath.split('.').pop() || 'file';
        const finalFileName = resumeFileName || `resume.${defaultFileName}`;
        finalResumeFileID = await this.uploadResumeFile(resumePath, userId, finalFileName);
      }
      
      // 4. 调用云函数执行最终的资料更新
      const updateRes = await wx.cloud.callFunction({
        name: 'userUpdate', // 调用更新云函数
        data: {
          userId: userId, 
          // 传递所有业务字段
          nickName: name, 
          phone: phoneNumber ? phoneNumber : null, 
          avatarUrl: finalAvatarUrl,
          gender: gender,
          age: parseInt(age),
          region: regionDisplay,
          education: education,
          isFullTime: isFullTime === '是',
          schoolName: schoolName,
          major: major,
          graduationDate: graduationDate,
          resumeFileID: finalResumeFileID
        }
      });
      
      // 5. 处理更新结果
      if (updateRes.result && updateRes.result.success) {
        
        // 【关键：更新本地缓存】
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo) {
          // 更新所有修改的字段
          cachedUserInfo.nickName = name;
          cachedUserInfo.phone = phoneNumber;
          cachedUserInfo.avatarUrl = finalAvatarUrl;
          cachedUserInfo.gender = gender;
          cachedUserInfo.age = parseInt(age);
          cachedUserInfo.region = regionDisplay;
          cachedUserInfo.education = education;
          cachedUserInfo.isFullTime = isFullTime === '是';
          cachedUserInfo.schoolName = schoolName;
          cachedUserInfo.major = major;
          cachedUserInfo.graduationDate = graduationDate;
          cachedUserInfo.resumeFileID = finalResumeFileID;
          wx.setStorageSync('userInfo', cachedUserInfo);
        }
        
        wx.hideLoading();
        wx.showModal({
          title: '保存成功',
          content: '您的资料已更新。',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 1  });
          }
        });
        
      } else {
        this.setData({  isSaving: false });
        throw new Error(updateRes.result.message || '更新失败');
      }

    } catch (e) {
      this.setData({  isSaving: false }); // 恢复状态
      wx.hideLoading();
      console.error('保存资料失败:', e);
      wx.showModal({
        title: '保存失败',
        content: `资料更新失败：${e.message  || '网络连接或权限错误'}`,
        showCancel: false,
      });
    }
  },
});