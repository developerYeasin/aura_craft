import { useI18n } from '../../i18n/index.jsx';
import { money, toBn, priceInfo } from '../../utils/format.js';

/** "-20%" or "৳200 off" — whichever the admin actually configured. */
export const DiscountBadge = ({ product, info = priceInfo(product), long = false }) => {
  const { t } = useI18n();
  if (!info.hasDiscount) return null;
  const label =
    info.type === 'fixed'
      ? t('common.amountOff', { amount: money(info.value) })
      : long
        ? t('common.percentOff', { n: toBn(info.percent) })
        : `-${toBn(info.percent)}%`;
  return <span className="badge badge--sale">{label}</span>;
};

export default DiscountBadge;
