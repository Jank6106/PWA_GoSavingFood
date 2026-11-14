-- Keep historical implementations intact behind authenticated ownership guards.
ALTER FUNCTION public.transition_order_status_transaction(uuid,text,uuid,text,text,jsonb)
  RENAME TO _transition_order_status_0040;
REVOKE ALL ON FUNCTION public._transition_order_status_0040(uuid,text,uuid,text,text,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.transition_order_status_transaction(
  p_order_id uuid, p_target_status text, p_actor_id uuid, p_actor_role text,
  p_reason text DEFAULT NULL, p_bank_info jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
AS $$
DECLARE o public.orders; actual_role text;
BEGIN
  IF auth.uid() IS NULL OR p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  SELECT role::text INTO actual_role FROM public.users WHERE id=auth.uid();
  SELECT * INTO o FROM public.orders WHERE id=p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF p_actor_role='admin' AND actual_role='admin' THEN
    NULL;
  ELSIF p_actor_role='customer' AND o.customer_id=auth.uid() AND p_target_status='cancelled' THEN
    NULL;
  ELSIF p_actor_role='merchant' AND actual_role='merchant' AND EXISTS(
    SELECT 1 FROM public.stores WHERE id=o.store_id AND owner_user_id=auth.uid()
  ) THEN
    IF p_target_status <> 'cancelled' AND (
      o.payment_status <> 'success' OR NOT (
        (o.status='paid' AND p_target_status='preparing') OR
        (o.status='preparing' AND p_target_status='ready_for_pickup') OR
        (o.status='ready_for_pickup' AND p_target_status='completed')
      )
    ) THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;
  ELSE RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN public._transition_order_status_0040(
    p_order_id,p_target_status,p_actor_id,p_actor_role,p_reason,p_bank_info);
END; $$;
REVOKE ALL ON FUNCTION public.transition_order_status_transaction(uuid,text,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid,text,uuid,text,text,jsonb) TO authenticated,service_role;

ALTER FUNCTION public.verify_pickup_qr(uuid,uuid) RENAME TO _verify_pickup_qr_0020;
REVOKE ALL ON FUNCTION public._verify_pickup_qr_0020(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.verify_pickup_qr(p_token uuid,p_store_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
AS $$
DECLARE o public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND (
      u.role='admin' OR (u.role='merchant' AND EXISTS(
        SELECT 1 FROM public.stores s WHERE s.id=p_store_id AND s.owner_user_id=u.id
      ))
    )
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO o FROM public.orders WHERE pickup_token=p_token AND store_id=p_store_id
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','INVALID_TOKEN'); END IF;
  IF o.status <> 'ready_for_pickup' OR o.payment_status <> 'success' THEN
    RETURN jsonb_build_object('success',false,'error','INVALID_STATUS');
  END IF;
  RETURN public._verify_pickup_qr_0020(p_token,p_store_id);
END; $$;
REVOKE ALL ON FUNCTION public.verify_pickup_qr(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_pickup_qr(uuid,uuid) TO authenticated,service_role;
