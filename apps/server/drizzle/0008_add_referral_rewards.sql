-- Create referral_rewards table for tracking referral earnings
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  amount_stars INTEGER NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_buyer ON referral_rewards(buyer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_rewards_purchase ON referral_rewards(purchase_id);
