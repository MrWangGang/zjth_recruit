Page({
  data: {
      cacheSize: '0.0KB', // 初始缓存大小
  },

  onLoad() {
      this.getCacheSize();
  },
  
  // Helper：将字节转换为 KB/MB/GB (保持不变)
  formatBytes(bytes) {
      if (bytes === 0) return '0.0KB';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  },

  /**
   * 1. 获取当前缓存大小 (用于刷新)
   */
  getCacheSize() {
      try {
          const res = wx.getStorageInfoSync();
          const currentSizeInBytes = res.currentSize * 1024; 
          this.setData({
              cacheSize: this.formatBytes(currentSizeInBytes)
          });
          console.log('当前缓存大小:', this.data.cacheSize);
      } catch (e) {
          console.error('获取缓存信息失败', e);
          this.setData({ cacheSize: '未知' });
      }
  },

  /**
   * 2. 清理缓存 (清理后调用 getCacheSize 刷新)
   */
  clearCache() {
      const currentCache = this.data.cacheSize;
      
      if (currentCache === '0.0KB' || currentCache === '未知') {
          wx.showModal({ 
              title: '提示', 
              content: '缓存已是最新状态，无需清理。', 
              showCancel: false 
          });
          return;
      }
      
      wx.showModal({
          title: '清理缓存',
          content: `确定要清理本地缓存（共 ${currentCache}）吗？`,
          success: (res) => {
              if (res.confirm) {
                  wx.showLoading({ title: '清理中...' });
                  wx.clearStorage({
                      success: () => {
                          wx.hideLoading();
                          // 重新计算并显示缓存大小：这就是您要求的刷新逻辑
                          this.getCacheSize(); 
                          wx.showModal({
                              title: '清理成功',
                              content: '本地缓存已清理完毕。',
                              showCancel: false,
                          });
                      },
                      fail: (e) => {
                          wx.hideLoading();
                          console.error('清理缓存失败', e);
                          wx.showModal({
                              title: '清理失败',
                              content: '清理缓存过程中发生错误，请重试。',
                              showCancel: false,
                          });
                      }
                  });
              }
          }
      });
  },
  
  /**
   * 3. 通用提示函数：替代所有跳转和注销功能 (保持不变)
   */
  showDevelopingTip(e) {
      const title = e.currentTarget.dataset.title || '该功能';
      
      wx.showModal({
          title: '功能开发中',
          content: `${title} 正在紧急开发和优化中，敬请期待！`,
          showCancel: false,
          confirmText: '我知道了'
      });
  },
});