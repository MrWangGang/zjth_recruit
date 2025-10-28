// pages/job_detail/index.js
Page({
  data: {
      jobId: null,
      userId: null,
      jobDetail: null,
      
      jobDutyNodes: [],
      qualificationNodes: [],
      salaryNodes: [],
      
      // ⭐ 关键：新增职位状态字段
      jobStatus: '加载中...', // 职位本身的生命周期状态：'生效' / '失效' / '加载中...'
      deliveryStatus: '未登录', // 用户的投递历史状态：'未登录' / '未投递' / '已投递' / '重复投递'
      isLoaded: false,
  },

  onLoad: function (options) {
      const jobId = options.jobId;
      const cachedUserInfo = wx.getStorageSync('userInfo');
      const userId = cachedUserInfo ? (cachedUserInfo._id || cachedUserInfo.userId) : null;
      
      if (!jobId) {
          wx.showToast({ title: '职位参数缺失', icon: 'none' });
          setTimeout(() => { wx.navigateBack(); }, 1500);
          return;
      }

      this.setData({ jobId: jobId, userId: userId });
      this.loadJobDetail(jobId, userId);
  },

  /**
   * 辅助函数：将纯文本（包含 \n）转换为 rich-text Nodes 数组。
   */
  textToRichTextNodes: function(plainText) {
      if (!plainText) return [];

      // 将文本按换行符分割
      const nodes = [];
      const lines = plainText.split('\n');

      lines.forEach((line, index) => {
          // 处理列表项（带编号）
          if (line.match(/^\d+\.\s/)) {
              nodes.push({
                  name: 'li',
                  attrs: { class: 'rich-text-li' },
                  children: [{ type: 'text', text: line.trim() }]
              });
          } else {
              nodes.push({
                  name: 'p',
                  attrs: { class: 'rich-text-p' },
                  children: [{ type: 'text', text: line.trim() }]
              });
          }
      });
      
      return nodes;
  },

  /**
   * 调用云函数加载职位详情
   */
  loadJobDetail: function(jobId, userId) {
      wx.showToast({ title: '正在加载职位详情...', icon: 'loading', mask: true, duration: 15000 });

      wx.cloud.callFunction({
          name: 'getJobDetail',
          data: { jobId: jobId, userId: userId }
      }).then(res => {
          wx.hideToast();
          if (res.result && res.result.success) {
              const detail = res.result.jobDetail;

              // ⭐ 关键修正：从云函数结果中提取 jobStatus 和 latestDeliveryStatus
              // 假设职位状态字段在云函数返回的 jobDetail 中为 status
              const currentJobStatus = detail.status || '生效'; 
              const userDeliveryStatus = detail.latestDeliveryStatus || (userId ? '未投递' : '未登录');
              
              this.setData({
                  jobDetail: detail,
                  jobStatus: currentJobStatus, // 职位状态
                  deliveryStatus: userDeliveryStatus, // 投递状态
                  jobDutyNodes: this.textToRichTextNodes(detail.jobDuty),
                  qualificationNodes: this.textToRichTextNodes(detail.qualification),
                  salaryNodes: this.textToRichTextNodes(detail.salaryRange),
                  isLoaded: true
              });
          } else {
              wx.hideToast();
              wx.showModal({ 
                title: '加载失败', 
                content: res.result.message || '获取职位详情失败', 
                showCancel: false,
                success: () => wx.navigateBack()
              });
              this.setData({ isLoaded: true, jobStatus: '失效' }); // 失败时也设置为失效状态
          }
      }).catch(err => {
          wx.hideToast();
          console.error('加载职位详情失败:', err);
          wx.showToast({ title: '网络错误', icon: 'none' });
          this.setData({ isLoaded: true, jobStatus: '失效' }); // 网络错误时也设置为失效状态
      });
  },
  
  onDeliverTap: function() {
      // 从 data 中解构 jobStatus
      const { userId, jobId, jobDetail, deliveryStatus, jobStatus } = this.data; 

      // ⭐ 关键修正：第一步检查职位状态
      if (jobStatus === '失效') {
        wx.showToast({ title: '该职位已关闭，无法投递', icon: 'none' });
        return; // 职位已关闭，直接退出
      }

      // 修正后的未登录检查逻辑
      if (!userId) {
        wx.showModal({
            title: '请先登录',
            content: '投递简历需要登录，是否前往个人中心？',
            confirmText: '去登录',
            success: (res) => {
                if (res.confirm) {
                    wx.switchTab({ url: '/pages/myself/index' }); 
                }
            }
        });
        return; 
      }
      
      const contentMessage = (deliveryStatus === '已投递' || deliveryStatus === '重复投递') 
          ? '您之前已投递过，确定再次投递吗？' 
          : `确定向【${jobDetail.title}】投递简历吗？`;

      wx.showModal({
          title: (deliveryStatus === '已投递' || deliveryStatus === '重复投递') ? '重复投递确认' : '确认投递',
          content: contentMessage,
          success: (res) => {
              if (res.confirm) {
                  this.callDeliverJobCloudFunction(jobId, userId);
              }
          }
      });
  },

  /**
   * 调用投递简历云函数
   */
  callDeliverJobCloudFunction: function(jobId, userId) {
      wx.showLoading({ title: '投递中...', mask: true });

      wx.cloud.callFunction({
          name: 'deliverJob', 
          data: { jobId: jobId, userId: userId }
      }).then(res => {
          wx.hideLoading();
          if (res.result && res.result.success) {
              
              // ⭐ 关键修正：根据云函数返回的 message 确定是 '重复投递' 还是 '立即投递简历'
              const status = res.result.message.includes('已更新') ? '重复投递' : '已投递';

              wx.showToast({ title: '简历投递成功！', icon: 'success', duration: 1000 });
              this.setData({ deliveryStatus: status }); // 更新页面状态
              
              setTimeout(() => {
                  wx.navigateBack({ delta: 1 });
              }, 1000); 

          } else {
              // ... (失败逻辑) ...
              const message = res.result.message || '投递过程发生错误，请稍后再试。';
              wx.showModal({
                  title: '投递失败',
                  content: message, 
                  showCancel: false
              });
          }
      }).catch(err => {
          wx.hideLoading();
          console.error('调用投递云函数异常:', err);
          wx.showToast({ title: '网络连接失败', icon: 'none' });
      });
  }

});