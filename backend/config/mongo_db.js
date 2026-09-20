const mongoose = require('mongoose');
require('dotenv').config();

// Memory store fallback if MongoDB instance is unavailable
const memoryDocs = {
  vendors_menus: [],
  rider_logistics: [],
  order_tracking_logs: [],
  reviews_analytics: [],
  system_audit_logs: []
};

let isMongoConnected = false;

// 1. Vendors & Menus Schema
const vendorMenuSchema = new mongoose.Schema({
  vendor_id: { type: Number, required: true, unique: true },
  business_name: String,
  cuisine_types: [String],
  chef_bio: String,
  hero_image_url: String,
  operating_hours: String,
  categories: [
    {
      category_name: String,
      dishes: [
        {
          dish_id: Number,
          name: String,
          description: String,
          image_url: String,
          price: Number,
          dietary_tags: [String],
          customizations: [{ option_name: String, extra_cost: Number }]
        }
      ]
    }
  ]
}, { timestamps: true });

// 2. Rider Logistics Schema
const riderLogisticsSchema = new mongoose.Schema({
  rider_id: { type: Number, required: true, unique: true },
  vehicle_type: String,
  license_plate: String,
  shift_status: { type: String, enum: ['ONLINE', 'OFFLINE', 'ON_DELIVERY'], default: 'OFFLINE' },
  live_coordinates: {
    lat: Number,
    lng: Number
  },
  assigned_order_id: Number,
  total_deliveries_completed: { type: Number, default: 0 }
}, { timestamps: true });

// 3. Order Tracking Log Schema
const orderTrackingLogSchema = new mongoose.Schema({
  order_id: { type: Number, required: true, unique: true },
  timeline: [
    {
      event: String,
      timestamp: { type: Date, default: Date.now },
      location_note: String,
      actor_role: String
    }
  ],
  estimated_delivery_time: String
}, { timestamps: true });

// 4. Reviews & Analytics Schema
const reviewAnalyticsSchema = new mongoose.Schema({
  review_id: { type: Number, required: true, unique: true },
  order_id: Number,
  customer_id: Number,
  vendor_id: Number,
  rider_id: Number,
  vendor_rating: Number,
  rider_rating: Number,
  comment: String,
  sentiment_label: { type: String, enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'], default: 'POSITIVE' },
  created_at: { type: Date, default: Date.now }
});

// 5. System Audit Log Schema
const systemAuditLogSchema = new mongoose.Schema({
  log_id: { type: Number, required: true, unique: true },
  admin_user_id: Number,
  action_type: String,
  details_json: Object,
  timestamp: { type: Date, default: Date.now }
});

const VendorMenu = mongoose.model('VendorMenu', vendorMenuSchema);
const RiderLogistics = mongoose.model('RiderLogistics', riderLogisticsSchema);
const OrderTrackingLog = mongoose.model('OrderTrackingLog', orderTrackingLogSchema);
const ReviewAnalytics = mongoose.model('ReviewAnalytics', reviewAnalyticsSchema);
const SystemAuditLog = mongoose.model('SystemAuditLog', systemAuditLogSchema);

async function initMongoDb() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chefhub_db';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    console.log('[Mongo Engine] Connected to MongoDB instance successfully.');
  } catch (err) {
    console.log('[Mongo Engine] MongoDB offline. Operating in Resilient Mongo Memory Mode for zero-friction evaluation.');
    isMongoConnected = false;
  }
}

// Resilient collection helper wrappers
const MongoAdapter = {
  async findVendorMenu(vendor_id) {
    if (isMongoConnected) return await VendorMenu.findOne({ vendor_id });
    return memoryDocs.vendors_menus.find(v => v.vendor_id === Number(vendor_id)) || null;
  },
  async findOrSeedVendorMenus(seedData) {
    if (isMongoConnected) {
      for (const item of seedData) {
        const existing = await VendorMenu.findOne({ vendor_id: item.vendor_id });
        if (existing && existing.categories && item.categories) {
          for (const cat of item.categories) {
            const exCat = existing.categories.find(c => c.category_name.toLowerCase() === cat.category_name.toLowerCase());
            if (exCat && exCat.dishes) {
              for (const dish of cat.dishes) {
                const exDish = exCat.dishes.find(d => Number(d.dish_id) === Number(dish.dish_id) || d.name.toLowerCase() === dish.name.toLowerCase());
                if (exDish && exDish.image_url) {
                  dish.image_url = exDish.image_url;
                }
                if (exDish && exDish.description) {
                  dish.description = exDish.description;
                }
              }
            }
          }
        }
        await VendorMenu.findOneAndUpdate({ vendor_id: item.vendor_id }, item, { upsert: true });
      }
    } else {
      if (!Array.isArray(memoryDocs.vendors_menus)) {
        memoryDocs.vendors_menus = [];
      }
      for (const item of seedData) {
        const idx = memoryDocs.vendors_menus.findIndex(v => Number(v.vendor_id) === Number(item.vendor_id));
        if (idx >= 0) {
          const existing = memoryDocs.vendors_menus[idx];
          if (existing && existing.categories && item.categories) {
            for (const cat of item.categories) {
              const exCat = existing.categories.find(c => c.category_name.toLowerCase() === cat.category_name.toLowerCase());
              if (exCat && exCat.dishes) {
                for (const dish of cat.dishes) {
                  const exDish = exCat.dishes.find(d => Number(d.dish_id) === Number(dish.dish_id) || d.name.toLowerCase() === dish.name.toLowerCase());
                  if (exDish && exDish.image_url) {
                    dish.image_url = exDish.image_url;
                  }
                  if (exDish && exDish.description) {
                    dish.description = exDish.description;
                  }
                }
              }
            }
          }
          memoryDocs.vendors_menus[idx] = item;
        } else {
          memoryDocs.vendors_menus.push(item);
        }
      }
    }
  },
  async upsertRider(rider_id, data) {
    if (isMongoConnected) {
      return await RiderLogistics.findOneAndUpdate({ rider_id }, { ...data, rider_id }, { upsert: true, new: true });
    } else {
      const idx = memoryDocs.rider_logistics.findIndex(r => r.rider_id === Number(rider_id));
      const entry = { rider_id: Number(rider_id), ...data };
      if (idx >= 0) memoryDocs.rider_logistics[idx] = entry;
      else memoryDocs.rider_logistics.push(entry);
      return entry;
    }
  },
  async getRider(rider_id) {
    if (isMongoConnected) return await RiderLogistics.findOne({ rider_id });
    return memoryDocs.rider_logistics.find(r => r.rider_id === Number(rider_id)) || null;
  },
  async pushTrackingLog(order_id, eventObj) {
    if (isMongoConnected) {
      return await OrderTrackingLog.findOneAndUpdate(
        { order_id },
        { $push: { timeline: eventObj }, $setOnInsert: { estimated_delivery_time: '25-35 mins' } },
        { upsert: true, new: true }
      );
    } else {
      let log = memoryDocs.order_tracking_logs.find(l => l.order_id === Number(order_id));
      if (!log) {
        log = { order_id: Number(order_id), timeline: [], estimated_delivery_time: '25-35 mins' };
        memoryDocs.order_tracking_logs.push(log);
      }
      log.timeline.push(eventObj);
      return log;
    }
  },
  async getTrackingLog(order_id) {
    if (isMongoConnected) return await OrderTrackingLog.findOne({ order_id });
    return memoryDocs.order_tracking_logs.find(l => l.order_id === Number(order_id)) || null;
  },
  async upsertReview(reviewObj) {
    if (isMongoConnected) {
      return await ReviewAnalytics.findOneAndUpdate(
        { order_id: Number(reviewObj.order_id) },
        reviewObj,
        { upsert: true, new: true }
      );
    } else {
      const idx = memoryDocs.reviews_analytics.findIndex(r => Number(r.order_id) === Number(reviewObj.order_id));
      if (idx >= 0) {
        memoryDocs.reviews_analytics[idx] = { ...memoryDocs.reviews_analytics[idx], ...reviewObj };
        return memoryDocs.reviews_analytics[idx];
      } else {
        memoryDocs.reviews_analytics.push(reviewObj);
        return reviewObj;
      }
    }
  },
  async createReview(reviewObj) {
    return await this.upsertReview(reviewObj);
  },
  async getReviewForOrder(order_id) {
    if (isMongoConnected) return await ReviewAnalytics.findOne({ order_id: Number(order_id) });
    return memoryDocs.reviews_analytics.find(r => Number(r.order_id) === Number(order_id)) || null;
  },
  async getReviews(filter = {}) {
    if (isMongoConnected) return await ReviewAnalytics.find(filter);
    return memoryDocs.reviews_analytics.filter(r => {
      if (filter.vendor_id && r.vendor_id !== Number(filter.vendor_id)) return false;
      if (filter.rider_id && r.rider_id !== Number(filter.rider_id)) return false;
      return true;
    });
  },
  async addAuditLog(admin_user_id, action_type, details_json) {
    const logObj = {
      log_id: Date.now(),
      admin_user_id,
      action_type,
      details_json,
      timestamp: new Date()
    };
    if (isMongoConnected) {
      await SystemAuditLog.create(logObj);
    } else {
      memoryDocs.system_audit_logs.push(logObj);
    }
    return logObj;
  },
  async getAuditLogs() {
    if (isMongoConnected) return await SystemAuditLog.find().sort({ timestamp: -1 });
    return [...memoryDocs.system_audit_logs].reverse();
  }
};

module.exports = {
  initMongoDb,
  MongoAdapter,
  VendorMenu,
  RiderLogistics,
  OrderTrackingLog,
  ReviewAnalytics,
  SystemAuditLog
};
