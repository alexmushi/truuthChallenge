const DOC_MAP = {
  AU_PASSPORT: { classifierType: 'PASSPORT', verifyType: 'PASSPORT' },
  AU_DRIVER_LICENCE: { classifierType: 'DRIVERS_LICENCE', verifyType: 'DRIVERS_LICENCE' },
  RESUME: { classifierType: null, verifyType: 'OTHER' }
};

function getAuthHeader() {
  const key = (process.env.TRUUTH_API_KEY || '').trim();
  const secret = (process.env.TRUUTH_API_SECRET || '').trim();
  if (!key || !secret) {
    throw new Error('Truuth credentials are missing.');
  }
  return `Basic ${Buffer.from(`${key}:${secret}`, 'utf8').toString('base64')}`;
}

function withTenantAlias(urlTemplate) {
  const url = urlTemplate || '';
  if (!url.includes('{tenantAlias}')) return url;

  const tenantAlias = (process.env.TRUUTH_TENANT_ALIAS || '').trim();
  if (!tenantAlias) {
    throw new Error('TRUUTH_TENANT_ALIAS is required for tenant-scoped verify endpoints.');
  }
  return url.replace('{tenantAlias}', tenantAlias);
}

async function requestJson(url, options = {}, timeoutMs = 40000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const bodyText = await response.text();
    let body = {};
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = {};
      }
    }
    if (!response.ok) {
      const detail = bodyText ? ` Response body: ${bodyText}` : '';
      throw new Error(`Truuth API request failed (${response.status}).${detail}`);
    }
    return body;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Truuth API request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function classifyIfNeeded(docType, mimeType, base64Image) {
  const map = DOC_MAP[docType];
  if (!map.classifierType) return;

  const result = await requestJson(
    process.env.TRUUTH_CLASSIFIER_URL || 'https://api.au.truuth.id/document-management/v1/classify',
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [{ image: base64Image, mimeType }]
      })
    },
    40000
  );

  const countryCode = result?.country?.code;
  const documentTypeCode = result?.documentType?.code;

  if (countryCode !== 'AUS' || documentTypeCode !== map.classifierType) {
    throw new Error(
      docType === 'AU_PASSPORT'
        ? 'This does not appear to be an Australian passport. Please upload the correct document.'
        : 'This does not appear to be an Australian driver licence. Please upload the correct document.'
    );
  }
}

async function submitForVerification(docType, mimeType, base64Image, externalRefId) {
  const verifyPayload = {
    document: {
      countryCode: 'AUS',
      documentType: DOC_MAP[docType].verifyType,
      image: { content: base64Image, mimeType }
    },
    externalRefId,
    options: {
      requiredChecks: [{ name: 'DEEPFAKE' }, { name: 'VISUAL_ANOMALY' }, { name: 'WATERMARK_CHECK' }]
    }
  };

  const submitUrl = withTenantAlias(
    process.env.TRUUTH_VERIFY_SUBMIT_URL
      || 'https://submissions.api.au.truuth.id/verify-document/v1/tenants/{tenantAlias}/documents/submit'
  );

  return requestJson(
    submitUrl,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyPayload)
    },
    50000
  );
}

async function fetchVerificationResult(verifyId) {
  const baseUrl = withTenantAlias(
    process.env.TRUUTH_VERIFY_RESULT_URL
      || 'https://submissions.api.au.truuth.id/verify-document/v1/tenants/{tenantAlias}/documents'
  );
  return requestJson(
    `${baseUrl}/${verifyId}`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader()
      }
    },
    35000
  );
}

module.exports = { classifyIfNeeded, submitForVerification, fetchVerificationResult };
