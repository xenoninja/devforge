export function formText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function formChecked(form: FormData, name: string) {
  return form.get(name) === "on";
}
