import { useRouter } from 'next/router';
import { getBasePath } from '../../lib/helpers/getBasePath';
import { getOrigin } from '../../lib/helpers/getOrigin';

export const useCanonicalUrl = (locale: string): string | null => {
  const { asPath, basePath } = useRouter();
  const [path, query] = asPath.split('?');
  const origin = getOrigin();
  const queryString = new URLSearchParams(query).toString();

  return `${origin}${getBasePath(basePath)}${locale}${path}${
    queryString ? '?' + queryString : ''
  }`;
};
