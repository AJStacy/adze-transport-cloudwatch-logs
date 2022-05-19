import { LocalStorage } from 'node-localstorage';

let _localStorage = window.localStorage;
if (typeof _localStorage === 'undefined' || _localStorage === null) {
  _localStorage = new LocalStorage('./scratch');
}

export default _localStorage;
