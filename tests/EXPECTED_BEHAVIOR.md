# V10.88.1 acceptance cases

- Teacher A uploads pending resource: Teacher A and Admin can read it; Teacher B cannot.
- Admin uploads and approves resource: every authenticated teacher can read it.
- Admin can update pending to approved.
- Teacher cannot approve their own pending resource through direct table update.
- Admin/TTCM/Drive owner can delete; teacher cannot delete approved items.
- Old rows containing owner_id only and new rows containing uploader_id only are both visible correctly.
