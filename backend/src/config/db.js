import mongoose from 'mongoose';

export const connectMongo = async (uri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[mongo] connected');
};

export const disconnectMongo = () => mongoose.disconnect();
