# Chrome Extension 모듈화 이슈 및 해결 방안

## 🚨 발생한 문제

### 증상
- 모듈화 후 캡처 기능 작동 안 함
- 키보드 단축키(Alt+S) 작동 안 함
- 콘솔에 모듈 로드 에러 발생

### 원인
Chrome Extension의 content script는 **ES6 모듈 시스템을 지원하지 않습니다**.

```javascript
// ❌ Content script에서 작동하지 않음
import { VideoDetector } from './modules/video-detector.js';

// ❌ 동적 import도 작동하지 않음
const { VideoDetector } = await import('./modules/video-detector.js');
```

### 기술적 배경
1. Content scripts는 "isolated world"에서 실행됨
2. `type="module"` 속성을 사용할 수 없음
3. Chrome은 보안상의 이유로 content script에서 ES6 모듈을 차단

## ✅ 즉각적인 해결책

원래의 단일 파일 구조(`notnot-content.js`)로 롤백하여 기능을 복구했습니다.

```json
// manifest.json
"content_scripts": [{
  "js": ["content-scripts/notnot-content.js"]  // 원래 파일로 복구
}]
```

## 🔧 향후 모듈화 방안

### 방안 1: Webpack 사용 (권장)
```javascript
// webpack.config.js
module.exports = {
  entry: './content-scripts/notnot-content-v2.js',
  output: {
    filename: 'notnot-content-bundled.js',
    path: path.resolve(__dirname, 'dist/content-scripts')
  },
  resolve: {
    extensions: ['.js']
  }
};
```

### 방안 2: Rollup 사용
```javascript
// rollup.config.js
export default {
  input: 'content-scripts/notnot-content-v2.js',
  output: {
    file: 'dist/content-scripts/notnot-content-bundled.js',
    format: 'iife'
  }
};
```

### 방안 3: 수동 번들링 스크립트
```bash
#!/bin/bash
# build-bundle.sh
cat content-scripts/modules/constants.js \
    content-scripts/modules/utils.js \
    content-scripts/modules/storage-manager.js \
    content-scripts/modules/area-selector.js \
    content-scripts/modules/capture-handler.js \
    content-scripts/modules/video-detector.js \
    content-scripts/modules/overlay-injector.js \
    content-scripts/modules/sidebar-ui.js \
    content-scripts/notnot-content-v2.js \
    > dist/content-scripts/notnot-content-bundled.js
```

## 📋 권장 실행 계획

### 1단계: 현재 상태 유지
- 원래의 `notnot-content.js` 사용
- 모든 기능 정상 작동 확인

### 2단계: 번들러 도입 (2주차)
1. Webpack 설치 및 설정
2. 모듈화된 코드를 번들링
3. 개발/프로덕션 빌드 구분

### 3단계: TypeScript 마이그레이션 (3주차)
1. TypeScript 설정
2. 타입 정의 추가
3. 점진적 마이그레이션

### 4단계: 테스트 자동화 (4주차)
1. Jest 설정
2. 단위 테스트 작성
3. E2E 테스트 추가

## 🎯 교훈

1. **Chrome Extension의 제약사항을 먼저 확인**
   - Content script의 한계 이해
   - 브라우저 API 제약사항 파악

2. **점진적 마이그레이션**
   - 한 번에 모든 것을 바꾸지 말 것
   - 각 단계마다 테스트

3. **빌드 도구의 중요성**
   - 모던 JavaScript를 사용하려면 번들러 필수
   - 개발 환경 구축에 투자

## 📚 참고 자료
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Webpack for Chrome Extensions](https://github.com/Kocal/vue-web-extension)
- [Chrome Extension Boilerplate](https://github.com/lxieyang/chrome-extension-boilerplate-react)