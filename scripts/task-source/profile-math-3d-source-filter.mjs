// Select real unused source tasks supported by the already approved 3D scene.
// Never rewrite a condition or invent replacement numbers.
export function supportedTrafficTask(task, filter = 'all') {
  if (!filter || filter === 'all') return true;
  if (filter !== 'traffic_meeting_whole_hours') throw Error('Unknown approved source filter');
  const text = String(task?.condition_text ?? '');
  if (!/автомобил/iu.test(text) || !/одновременно/iu.test(text) || !/навстречу/iu.test(text) || !/встрет|встреч/iu.test(text)) return false;
  if (/минут|позже|раньше|останов|увелич|уменьш|изменил|быстрее|медленнее/iu.test(text)) return false;
  const speeds = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*км\s*\/\s*ч/giu)].map(m=>Number(m[1].replace(',','.')));
  const distances = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*км(?!\s*\/)/giu)].map(m=>Number(m[1].replace(',','.')));
  if (speeds.length !== 2 || distances.length !== 1 || speeds.some(n=>!Number.isFinite(n)||n<=0||n>300) || distances[0]<=0) return false;
  const hours = distances[0]/(speeds[0]+speeds[1]);
  return Number.isInteger(hours) && hours>=1 && hours<=6;
}
