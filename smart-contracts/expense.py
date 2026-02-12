from pyteal import *


def expense_approval() -> Expr:
    """
    Minimal stateless PyTeal template for CampusPay expenses.

    This is intentionally simple for the hackathon MVP – it sketches how you
    could restrict ASA transfers so that only participants can send CAMPUS
    to the expense creator. The current frontend/backend implementation does
    not depend on this contract being deployed.
    """

    is_asset_transfer = Gtxn[0].type_enum() == TxnType.AssetTransfer

    program = Seq(
        Assert(is_asset_transfer),
        Approve(),
    )

    return program


if __name__ == "__main__":
    print(compileTeal(expense_approval(), mode=Mode.Signature, version=8))

