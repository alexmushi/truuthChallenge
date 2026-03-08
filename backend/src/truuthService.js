const { runPython } = require('./pythonBridge');

const DOC_MAP = {
  AU_PASSPORT: { classifierType: 'PASSPORT', verifyType: 'PASSPORT' },
  AU_DRIVER_LICENCE: { classifierType: 'DRIVERS_LICENCE', verifyType: 'DRIVERS_LICENCE' },
  RESUME: { classifierType: null, verifyType: 'OTHER' }
};

async function classifyIfNeeded(docType, mimeType, base64Image) {
  const map = DOC_MAP[docType];
  if (!map.classifierType) return;

  const result = await runPython({
    action: 'classify',
    payload: {
      images: [{ image: base64Image, mimeType }]
    }
  });

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

  return runPython({ action: 'submit_verify', payload: verifyPayload });
}

async function fetchVerificationResult(verifyId) {
  return runPython({ action: 'get_result', verifyId });
}

module.exports = { classifyIfNeeded, submitForVerification, fetchVerificationResult };
