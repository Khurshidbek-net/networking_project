import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 100, 
  duration: '30s', 
};

export default function () {
  http.get('http://13.49.70.150:3000/api/products');
  sleep(1);
}
