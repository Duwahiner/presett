import dayjs from 'dayjs';
import 'dayjs/locale/es';

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
  // Parse in local mode so a trailing "Z" (UTC) instant is rendered in the
  // browser/runtime timezone instead of being force-formatted as UTC.
  return dayjs(isoDate).format('D [de] MMMM [de] YYYY, h:mm a');
};

/**
 * Reduce a session id to a compact, recognizable form for display.
 * OpenCode session ids share the `ses_` prefix, so it is stripped and the
 * remainder is truncated (default 10 chars) — enough to distinguish sessions
 * without consuming card width.
 */
export const shortenSessionId = (sessionId: string, maxLength = 10): string => {
  const trimmed = sessionId.startsWith('ses_') ? sessionId.slice('ses_'.length) : sessionId;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};
