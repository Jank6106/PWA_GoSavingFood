import { INITIAL_ORDERS_MOCK } from '../mocks';
import type { OrderStatus } from '../types';
import { clone, delay } from './utils';

const orderStore = clone(INITIAL_ORDERS_MOCK);
export async function fetchMerchantOrders(storeId: string) { await delay(); return clone(orderStore.filter((order) => order.storeId === storeId)); }
export async function updateMerchantOrderStatus(orderId: string, status: OrderStatus, note?: string) { void note; await delay(260); const order = orderStore.find((item) => item.id === orderId); if (!order) throw new Error('Không tìm thấy đơn hàng.'); order.status = status; return clone(order); }
export async function verifyOrderQR(orderId: string, code: string) { await delay(380); const order = orderStore.find((item) => item.id === orderId); if (!order) throw new Error('Không tìm thấy đơn hàng.'); const normalized = code.trim().toUpperCase(); if (normalized !== order.qrCode.toUpperCase() && !normalized.includes(order.orderCode.toUpperCase())) return false; order.status = 'completed'; return true; }
export function getCompletedBagQuantity(storeId: string) { return orderStore.filter((order) => order.storeId === storeId && order.status === 'completed').reduce((total, order) => total + order.quantity, 0); }
