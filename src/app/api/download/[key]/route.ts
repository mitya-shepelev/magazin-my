import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Клиентские скачивания отключены. Доступ к продукту выдаётся через лицензию и установку администратором.",
    },
    { status: 410 }
  )
}
