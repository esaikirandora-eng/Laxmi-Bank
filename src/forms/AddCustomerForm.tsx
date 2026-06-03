import { useState } from "react";
import { Button } from "../components/Button";
import { Field, Input } from "../components/TextField";
import { useLedger } from "../store";

interface AddCustomerFormProps {
  onDone: () => void;
  onCancel: () => void;
}

export function AddCustomerForm({ onDone, onCancel }: AddCustomerFormProps) {
  const { addCustomer } = useLedger();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    try {
      setError("");
      await addCustomer({
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      onDone();
    } catch (err) {
      setError("Could not save customer. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full Name" required error={error && !fullName.trim() ? error : ""}>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Aarav Sharma"
          autoFocus
        />
      </Field>
      <Field label="Phone Number">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98xxx xxxxx"
          inputMode="tel"
        />
      </Field>
      <Field label="City">
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Mumbai"
        />
      </Field>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Customer</Button>
      </div>
    </form>
  );
}
