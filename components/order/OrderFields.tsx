"use client";

import { DELIVERY } from "@/lib/config";
import type { Errors, OrderFields, Platforms } from "@/lib/checkout";
import { ContactLine } from "../ContactLine";
import { Field, Select, TextArea, TextInput } from "./ui";

// /order хуудас болон сагсны "Мэдээлэл" алхам хоёулаа ашигладаг талбарууд
export const OTHER_DISTRICT = "__other";

type Set = (k: keyof OrderFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

export function LinkFields({ f, set, errors, needs }: { f: OrderFields; set: Set; errors: Errors; needs: Platforms }) {
  return (
    <>
      {needs.has("fb") && (
        <Field label="Facebook хуудас" hint="Жишээ: facebook.com/taniinhuudas" error={errors.fb}>
          <TextInput value={f.fb} onChange={set("fb")} invalid={!!errors.fb} placeholder="facebook.com/..." inputMode="url" autoComplete="url" />
        </Field>
      )}
      {needs.has("ig") && (
        <Field label="Instagram" hint="Жишээ: @taniinner эсвэл instagram.com/taniinner" error={errors.ig}>
          <TextInput value={f.ig} onChange={set("ig")} invalid={!!errors.ig} placeholder="@..." autoCapitalize="none" autoCorrect="off" />
        </Field>
      )}
    </>
  );
}

export function DeliveryFields({ f, set, errors }: { f: OrderFields; set: Set; errors: Errors }) {
  return (
    <>
      <Field label="Нэр" error={errors.name}>
        <TextInput value={f.name} onChange={set("name")} invalid={!!errors.name} autoComplete="name" />
      </Field>
      <Field label="Утас" error={errors.phone}>
        <TextInput value={f.phone} onChange={set("phone")} invalid={!!errors.phone} inputMode="tel" autoComplete="tel-national" placeholder="9911 2233" />
      </Field>
      <Field label="Имэйл (заавал биш)" hint="Төлбөрийн баримтыг имэйлээр илгээнэ" error={errors.email}>
        <TextInput value={f.email} onChange={set("email")} invalid={!!errors.email} type="email" inputMode="email" autoComplete="email" />
      </Field>
      <Field label="Дүүрэг" error={errors.district}>
        <Select value={f.district} onChange={set("district")} invalid={!!errors.district}>
          <option value="" disabled>Сонгоно уу</option>
          {DELIVERY.districts.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value={OTHER_DISTRICT}>Бусад газар</option>
        </Select>
      </Field>
      {f.district === OTHER_DISTRICT ? (
        <div className="border-[1.5px] border-ink p-6 text-base leading-[1.7]">
          Бусад газар хүргэх эсэхийг утсаар эсвэл имэйлээр тохирно: <ContactLine />
        </div>
      ) : (
        <>
          <Field label="Хаяг" hint="Хороо, байр, орц, тоот" error={errors.address}>
            <TextArea value={f.address} onChange={set("address")} invalid={!!errors.address} autoComplete="street-address" rows={2} />
          </Field>
          <Field label="Тэмдэглэл (заавал биш)" error={errors.note}>
            <TextArea value={f.note} onChange={set("note")} rows={2} />
          </Field>
        </>
      )}
      {/* Honeypot — хүнд харагдахгүй */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Вэбсайт<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
      </div>
    </>
  );
}
