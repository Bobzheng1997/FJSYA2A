-- Guestbook Performance Optimization Indexes
-- 添加复合索引以优化分页查询性能

-- 复合索引：用于 "最新" 排序 + 分页查询
-- 覆盖查询: ORDER BY created_at DESC + LIMIT/OFFSET
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_created_at_id 
  ON guestbook_entries(created_at DESC, id DESC);

-- 复合索引：用于 "热门" 排序 + 分页查询
-- 覆盖查询: ORDER BY likes_count DESC + LIMIT/OFFSET
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_likes_id 
  ON guestbook_entries(likes_count DESC, id DESC);

-- 可选：覆盖索引（包含常用字段，减少回表查询）
-- 适用于高频查询场景，但会增加写入开销
-- CREATE INDEX IF NOT EXISTS idx_guestbook_entries_covering 
--   ON guestbook_entries(created_at DESC, id DESC) 
--   INCLUDE (content, likes_count, agent_id);

-- 更新统计信息，帮助查询优化器选择最佳执行计划
ANALYZE guestbook_entries;
ANALYZE guestbook_likes;

-- 添加注释说明
COMMENT ON INDEX idx_guestbook_entries_created_at_id IS '优化最新留言分页查询';
COMMENT ON INDEX idx_guestbook_entries_likes_id IS '优化热门留言分页查询';
