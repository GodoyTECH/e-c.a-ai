'use client';

import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PaymentMethod, StoreSettings } from '@/lib/types';

type AddressLookup = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  confirmed: boolean;
  mapsLink: string;
  latitude?: number | null;
  longitude?: number | null;
};

function formatCepValue(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function CheckoutForm() {
  const { items, totalCents, addItem, removeItem, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [addressData, setAddressData] = useState<AddressLookup | null>(null);
  const [freightEstimateCents, setFreightEstimateCents] = useState(0);
  const [freightCalculated, setFreightCalculated] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        if (!data.allow_delivery && data.allow_pickup) setOrderType('pickup');
      });
  }, []);

  const availableTypes = [
    settings?.allow_delivery ? { label: 'Entrega', value: 'delivery' as const } : null,
    settings?.allow_pickup ? { label: 'Retirada', value: 'pickup' as const } : null
  ].filter(Boolean) as { label: string; value: 'delivery' | 'pickup' }[];

  const totalWithFreight = useMemo(
    () => totalCents + (orderType === 'delivery' ? freightEstimateCents : 0),
    [orderType, totalCents, freightEstimateCents]
  );

  async function resolveOriginCoordinates() {
    const hasCurrentOrigin =
      settings?.delivery_origin_mode === 'current_location' &&
      settings?.current_origin_latitude != null &&
      settings?.current_origin_longitude != null;

    if (hasCurrentOrigin) {
      return {
        latitude: Number(settings.current_origin_latitude),
        longitude: Number(settings.current_origin_longitude)
      };
    }

    if (settings?.store_postal_code) {
      const storeCepRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${settings.store_postal_code}, Brasil`)}`
      );
      const storeCepData = await storeCepRes.json();
      const storeLocation = storeCepData?.[0];
      if (storeLocation?.lat && storeLocation?.lon) {
        return {
          latitude: Number(storeLocation.lat),
          longitude: Number(storeLocation.lon)
        };
      }
    }

    return null;
  }

  async function calculateFreight(destination: { postalCode?: string; fullAddress?: string; latitude?: number | null; longitude?: number | null }) {
    setFreightCalculated(false);

    if (!settings?.freight_enabled || settings?.free_shipping_enabled) {
      setFreightEstimateCents(0);
      setFreightCalculated(true);
      return;
    }

    const freightPerKmBrl = Number(settings.freight_per_km_brl ?? Number(settings.freight_per_km_cents || 0) / 100);
    if (!freightPerKmBrl || freightPerKmBrl <= 0) {
      setFreightEstimateCents(0);
      setFreightCalculated(true);
      return;
    }

    try {
      const origin = await resolveOriginCoordinates();
      if (!origin) {
        setFreightEstimateCents(0);
        setFreightCalculated(true);
        return;
      }

      let destinationLat = destination.latitude ?? null;
      let destinationLon = destination.longitude ?? null;

      if ((destinationLat == null || destinationLon == null) && destination.fullAddress && destination.postalCode) {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${destination.fullAddress}, ${destination.postalCode}, Brasil`)}`;
        const geocodeRes = await fetch(geocodeUrl);
        const geocodeData = await geocodeRes.json();
        const first = geocodeData?.[0];
        destinationLat = first?.lat ? Number(first.lat) : null;
        destinationLon = first?.lon ? Number(first.lon) : null;
      }

      if ((destinationLat == null || destinationLon == null) && destination.postalCode) {
        const fallbackRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${destination.postalCode}, Brasil`)}`
        );
        const fallbackData = await fallbackRes.json();
        const first = fallbackData?.[0];
        destinationLat = first?.lat ? Number(first.lat) : null;
        destinationLon = first?.lon ? Number(first.lon) : null;
      }

      if (destinationLat == null || destinationLon == null) {
        setFreightEstimateCents(0);
        setFreightCalculated(true);
        return;
      }

      const distanceKm = haversineKm(origin.latitude, origin.longitude, destinationLat, destinationLon);
      setFreightEstimateCents(Math.round(distanceKm * freightPerKmBrl * 100));
      setFreightCalculated(true);
    } catch {
      setFreightEstimateCents(0);
      setFreightCalculated(true);
    }
  }

  async function onLookupCep(form: HTMLFormElement) {
    const formData = new FormData(form);
    const cep = String(formData.get('postalCode') || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('CEP inválido. Digite 8 números.');
      return;
    }

    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    const number = String(formData.get('addressNumber') || '').trim();
    const complement = String(formData.get('addressComplement') || '').trim();
    if (!data.logradouro || !data.bairro || !data.localidade || !data.uf) {
      alert('Não foi possível validar o endereço completo com esse CEP. Confira o CEP e tente novamente.');
      return;
    }

    const addressText = `${data.logradouro}, ${number || 's/n'}${complement ? ` - ${complement}` : ''}, ${data.bairro}, ${data.localidade}-${data.uf}`;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText + `, CEP ${cep}`)}`;

    setAddressData({
      cep,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      number,
      complement,
      mapsLink,
      confirmed: false
    });

    setFreightCalculated(false);
    await calculateFreight({ postalCode: cep, fullAddress: addressText });
  }

  function useCurrentCustomerLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalização indisponível neste navegador.');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        try {
          const reverseRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const reverseData = await reverseRes.json();
          const addr = reverseData?.address || {};
          const street = addr.road || addr.pedestrian || reverseData?.name || 'Localização atual';
          const neighborhood = addr.suburb || addr.neighbourhood || '';
          const city = addr.city || addr.town || addr.village || '';
          const state = addr.state_code || addr.state || '';
          const cep = (addr.postcode || '').replace(/\D/g, '').slice(0, 8);

          setAddressData({
            cep,
            street,
            neighborhood,
            city,
            state,
            number: addr.house_number || '',
            complement: '',
            mapsLink,
            confirmed: true,
            latitude,
            longitude
          });

          await calculateFreight({ postalCode: cep, fullAddress: reverseData?.display_name || street, latitude, longitude });
        } catch {
          setAddressData({
            cep: '',
            street: 'Localização atual',
            neighborhood: '',
            city: '',
            state: '',
            number: '',
            complement: '',
            mapsLink,
            confirmed: true,
            latitude,
            longitude
          });
          await calculateFreight({ latitude, longitude });
        }

        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
        alert('Não foi possível usar sua localização atual. Você pode continuar pelo CEP.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      alert('Carrinho vazio. Adicione itens antes de finalizar.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const phone = String(formData.get('customerPhone') || '').replace(/\D/g, '');
    if (!/^\d{10,13}$/.test(phone)) {
      alert('Telefone inválido. Use DDD + número.');
      return;
    }

    if (orderType === 'delivery' && (!addressData?.confirmed || !addressData.mapsLink)) {
      alert('Confirme o endereço no mapa antes de finalizar.');
      return;
    }

    setLoading(true);
    const fullAddress = addressData
      ? `${addressData.street}, ${addressData.number || 's/n'}${addressData.complement ? ` - ${addressData.complement}` : ''}, ${addressData.neighborhood}, ${addressData.city}-${addressData.state}`
      : String(formData.get('address') || '');

    const payload = {
      customerName: String(formData.get('customerName') || ''),
      customerPhone: phone,
      orderType,
      paymentMethod,
      address: fullAddress,
      postalCode: addressData?.cep || null,
      mapsLink: addressData?.mapsLink || null,
      addressConfirmed: Boolean(addressData?.confirmed),
      freightCents: orderType === 'delivery' ? freightEstimateCents : 0,
      customerLatitude: addressData?.latitude ?? null,
      customerLongitude: addressData?.longitude ?? null,
      notes: String(formData.get('notes') || ''),
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
        size: item.selectedSize,
        includedToppings: item.includedToppings,
        optionalToppings: item.optionalToppings,
        toppings: item.toppings
      }))
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      alert('Não foi possível concluir o pedido.');
      return;
    }

    const data = await response.json();
    clear();

    if (!data.whatsappUrl) {
      alert('Pedido salvo, mas o WhatsApp da loja ainda não está configurado.');
      return;
    }

    try {
      window.location.href = data.whatsappUrl;
    } catch {
      alert('Não foi possível abrir o WhatsApp.');
    }
  }

  if (settings && !settings.allow_delivery && !settings.allow_pickup) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <section className="card">
          <h1 className="text-xl font-bold">Checkout indisponível</h1>
          <p className="mt-2 text-sm text-slate-600">No momento não há tipo de atendimento disponível. Tente novamente mais tarde.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-2 md:p-8">
      <section className="card h-fit">
        <h2 className="text-xl font-bold">Seu carrinho</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.lineId} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary" onClick={() => removeItem(item.lineId)} type="button">-</button>
                  <span>{item.quantity}</span>
                  <button className="btn-secondary" onClick={() => addItem({ lineId: item.lineId, productId: item.productId, name: item.name, imageUrl: item.imageUrl, priceCents: item.priceCents, selectedSize: item.selectedSize, includedToppings: item.includedToppings, optionalToppings: item.optionalToppings, toppings: item.toppings })} type="button">+</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tamanho: {item.selectedSize.label} ({item.selectedSize.volumeMl}ml)</p>
              {item.includedToppings.length > 0 && (
                <p className="text-xs text-slate-500">Inclusos: {item.includedToppings.map((t) => t.name).join(', ')}</p>
              )}
              {item.optionalToppings.length > 0 && (
                <p className="text-xs text-slate-500">
                  Adicionais: {item.optionalToppings.map((t) => `${t.name} (+${currencyBRL(t.priceCents)})`).join(', ')}
                </p>
              )}
              <p className="mt-1 text-sm font-semibold">Subtotal: {currencyBRL(item.priceCents * item.quantity)}</p>
            </div>
          ))}
        </div>
        {orderType === 'delivery' && (
          <div className="mt-4 space-y-1 text-sm text-slate-700">
            <p>
              Frete estimado:{' '}
              {settings?.free_shipping_enabled || !settings?.freight_enabled
                ? 'Grátis'
                : freightCalculated
                  ? currencyBRL(freightEstimateCents)
                  : 'Informe o CEP ou use sua localização atual'}
            </p>
            <p>Subtotal do pedido: {currencyBRL(totalCents)}</p>
            <p className="font-semibold">Pedido + frete: {currencyBRL(totalWithFreight)}</p>
          </div>
        )}
        <p className="mt-2 text-lg font-bold">Total final do pedido: {currencyBRL(totalWithFreight)}</p>
      </section>

      <form className="card space-y-3" onSubmit={onSubmit}>
        <h2 className="text-xl font-bold">Finalizar pedido</h2>
        <input name="customerName" required placeholder="Nome completo" className="w-full rounded-xl border px-3 py-2" />
        <input name="customerPhone" required placeholder="Telefone (WhatsApp)" className="w-full rounded-xl border px-3 py-2" />

        <div>
          <p className="mb-1 font-medium">Tipo de pedido</p>
          <div className="flex gap-2">
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`rounded-xl px-4 py-2 ${orderType === type.value ? 'bg-acai text-white' : 'bg-slate-100'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 font-medium">Forma de pagamento</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: 'pix' as const, label: 'Pix' },
              { value: 'credit_card' as const, label: 'Cartão de crédito' },
              { value: 'debit_card' as const, label: 'Cartão de débito' }
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`rounded-xl px-3 py-2 text-sm ${paymentMethod === method.value ? 'bg-acai text-white' : 'bg-slate-100'}`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {orderType === 'delivery' ? (
          <section className="space-y-2 rounded-xl border p-3">
            <h3 className="font-semibold">Endereço de entrega</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={useCurrentCustomerLocation}>
                {loadingLocation ? 'Capturando localização...' : 'Usar localização atual'}
              </button>
              <p className="text-xs text-slate-500">Ou preencha o CEP abaixo.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="postalCode"
                placeholder="CEP"
                className="rounded-xl border px-3 py-2"
                maxLength={9}
                inputMode="numeric"
                pattern="^\d{5}-?\d{3}$"
                onChange={(event) => {
                  event.currentTarget.value = formatCepValue(event.currentTarget.value);
                }}
              />
              <input name="addressNumber" placeholder="Número" className="rounded-xl border px-3 py-2" />
            </div>
            <input name="addressComplement" placeholder="Complemento (opcional)" className="w-full rounded-xl border px-3 py-2" />
            <button type="button" className="btn-secondary" onClick={(event) => onLookupCep(event.currentTarget.form!)}>Buscar e validar CEP</button>
            {addressData && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p><strong>Endereço encontrado:</strong> {addressData.street}, {addressData.number || 's/n'}{addressData.complement ? ` - ${addressData.complement}` : ''}, {addressData.neighborhood}, {addressData.city}-{addressData.state} {addressData.cep ? `| CEP ${addressData.cep}` : ''}</p>
                <a href={addressData.mapsLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-acai underline">Clique no link para confirmar seu endereço no mapa</a>
                <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={addressData.confirmed} onChange={(event) => setAddressData((prev) => prev ? { ...prev, confirmed: event.target.checked } : prev)} />Confirmo que o endereço está correto no mapa</label>
              </div>
            )}
          </section>
        ) : null}

        <textarea name="notes" placeholder="Observações" className="w-full rounded-xl border px-3 py-2" rows={3} />

        <button className="btn-primary w-full" disabled={loading || items.length === 0}>
          {loading ? 'Processando...' : 'Deseja finalizar? Enviar pedido no WhatsApp'}
        </button>
      </form>
    </main>
  );
}
