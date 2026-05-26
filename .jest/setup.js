'use strict';

// Pre-resolve expo/winter lazy globals so they don't fire
// between tests in Jest 30 (which throws "require outside test scope").
// Accessing each property here forces the lazy getter to resolve eagerly,
// replacing the getter with a plain value on globalThis.
try { void globalThis.TextDecoder; } catch (_) {}
try { void globalThis.TextDecoderStream; } catch (_) {}
try { void globalThis.TextEncoderStream; } catch (_) {}
try { void globalThis.URL; } catch (_) {}
try { void globalThis.URLSearchParams; } catch (_) {}
try { void globalThis.DOMException; } catch (_) {}
try { void globalThis.__ExpoImportMetaRegistry; } catch (_) {}
try { void globalThis.structuredClone; } catch (_) {}
try { void globalThis.fetch; } catch (_) {}
