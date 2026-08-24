import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.locale('es');

export const getBytes = (num: number): string => {
  const unitTypes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "YB"];

  if (num <= 0) return "0 bytes";

  let index = Math.floor(Math.log(num) / Math.log(1000));

  index = Math.max(0, index);

  const magnitude = num / Math.pow(1000, index);
  const unit = unitTypes[index];

  return `${magnitude.toFixed(2)} ${unit}`;
};

export const formatDate = (isoDate: string): string => {
  return dayjs.utc(isoDate).format('D [de] MMMM [de] YYYY, h:mm a');
};
