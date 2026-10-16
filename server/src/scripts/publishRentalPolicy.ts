import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { StaticPage } from '../models/StaticPage';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const publishRentalPolicy = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/motorent_db';
  try {
    await mongoose.connect(uri);
    await StaticPage.updateOne(
      { slug: 'dieu-khoan-dich-vu' },
      {
        $set: { isPublished: true },
        $setOnInsert: {
          title: 'Điều Khoản Dịch Vụ Thuê Xe Motorent',
          content: 'Khách hàng cần xuất trình GPLX và CCCD hợp lệ để đối chiếu eKYC. Motorent cam kết không giữ bản gốc giấy tờ tùy thân của khách.',
        },
      },
      { upsert: true }
    );
    console.log('Điều khoản thuê xe đã được xuất bản.');
  } catch (error) {
    console.error('Không thể xuất bản điều khoản thuê xe:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void publishRentalPolicy();
