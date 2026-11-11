export async function copyPassword(value, sdk, clipboard = globalThis.navigator?.clipboard) {
  if (sdk) {
    await sdk.ready;
    if (!sdk.permissions.has('clipboard.write')) {
      throw Object.assign(new Error('Clipboard permission unavailable'), { code: 'PERMISSION_DENIED' });
    }
    await sdk.clipboard.writeText(value);
  } else {
    if (!clipboard?.writeText) throw Object.assign(new Error('Clipboard unavailable'), { code: 'API_UNSUPPORTED' });
    await clipboard.writeText(value);
  }
}

export async function openProjectLink(url, sdk) {
  await sdk.ready;
  if (!sdk.permissions.has('links.open')) {
    throw Object.assign(new Error('Link permission unavailable'), { code: 'PERMISSION_DENIED' });
  }
  await sdk.links.open(url);
}

export async function connectHost(sdk, applyTheme, onError) {
  if (!sdk) return () => {};
  let unsubscribe = () => {};
  try {
    await sdk.ready;
    if (sdk.permissions.has('theme.read')) {
      unsubscribe = sdk.theme.onChange(applyTheme);
      applyTheme(await sdk.theme.get());
    }
  } catch {
    onError('主题同步失败，可继续生成密码。');
  } finally {
    try { await sdk.lifecycle.ready(); }
    catch { onError('应用连接失败，可继续生成密码。'); }
  }
  return unsubscribe;
}
